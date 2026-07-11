"""Operator tool for provisioning credentials.

    uv run python -m scripts.manage_auth hash-password
    uv run python -m scripts.manage_auth set-password --identifier PATIENT-7712

Passwords are always read interactively (getpass) so they never land in shell
history or the process table.
"""

import argparse
import asyncio
import getpass
import sys

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.auth import hash_password, validate_password_policy
from app.core.config import get_settings
from app.services.users import set_user_password


def _prompt_password() -> str:
    if not sys.stdin.isatty():
        # Piped input (CI, ops scripts): read two lines. Still never an argv value,
        # so the password stays out of shell history and the process table.
        lines = sys.stdin.read().splitlines()
        if len(lines) < 2:
            raise SystemExit("Expected the password twice on stdin, one per line.")
        password, confirmation = lines[0], lines[1]
    else:
        password = getpass.getpass("Password: ")
        confirmation = getpass.getpass("Confirm password: ")
    if password != confirmation:
        raise SystemExit("Passwords do not match.")
    return password


def _check_policy(password: str) -> None:
    from fastapi import HTTPException

    try:
        validate_password_policy(password)
    except HTTPException as exc:
        raise SystemExit(f"Password rejected: {exc.detail}") from exc


def cmd_hash_password(args: argparse.Namespace) -> None:
    password = _prompt_password()
    _check_policy(password)
    kwargs = {"iterations": args.iterations} if args.iterations else {}
    print(hash_password(password, **kwargs))


async def _set_password(identifier: str, password: str, must_change: bool) -> None:
    from fastapi import HTTPException

    settings = get_settings()
    client = AsyncIOMotorClient(settings.mongodb_uri)
    try:
        await client.admin.command("ping")
        db = client[settings.database_name]
        user = await set_user_password(db, identifier=identifier, password=password, must_change=must_change)
        print(f"Password set for {user['publicId']} (role={user['role']}, mustChangePassword={must_change})")
    except HTTPException as exc:
        raise SystemExit(f"{exc.detail}") from exc
    finally:
        client.close()


def cmd_set_password(args: argparse.Namespace) -> None:
    password = _prompt_password()
    _check_policy(password)
    asyncio.run(_set_password(args.identifier, password, not args.no_must_change))


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="manage_auth", description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    hash_parser = subparsers.add_parser("hash-password", help="Print a hash for ADMIN_PASSWORD_HASH.")
    hash_parser.add_argument("--iterations", type=int, default=None)
    hash_parser.set_defaults(func=cmd_hash_password)

    set_parser = subparsers.add_parser("set-password", help="Set a user's password in MongoDB.")
    set_parser.add_argument("--identifier", required=True, help="userId (uuid) or publicId, e.g. PATIENT-7712")
    set_parser.add_argument(
        "--no-must-change",
        action="store_true",
        help="Do not force a password change on next login.",
    )
    set_parser.set_defaults(func=cmd_set_password)

    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    sys.exit(main())
