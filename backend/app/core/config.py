from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_AUTH_SECRET_KEY = "change-this-demo-secret-before-sharing"


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    database_name: str = "movement_analysis"
    upload_dir: str = "uploads"
    frontend_origin: str = "http://localhost:5173"
    auth_secret_key: str = DEFAULT_AUTH_SECRET_KEY
    access_token_ttl_minutes: int = 60
    playback_token_ttl_minutes: int = 5
    pbkdf2_iterations: int = 600000
    password_min_length: int = 12
    max_failed_logins: int = 5
    lockout_minutes: int = 15
    min_auth_secret_length: int = 32
    demo_login_password: str = ""
    demo_patients: str = "PATIENT-7712"
    demo_doctors: str = "DOCTOR-DEMO"
    demo_admins: str = "ADMIN-DEMO"
    admin_username: str = "admin"
    admin_password_hash: str = ""
    demo_doctor_patient_ids: str = "DOCTOR-DEMO:PATIENT-7712"
    mediapipe_service_url: str = "http://127.0.0.1:8000"
    mediapipe_api_key: str | None = None
    mediapipe_request_timeout_seconds: int = 120
    max_upload_size_mb: int = 200
    max_uploads_per_patient_per_day: int = 20
    max_total_upload_mb_per_patient: int = 2000
    recover_analysis_jobs_on_startup: bool = True
    store_raw_analysis_payload: bool = False
    upload_retention_days: int = 30

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def upload_path(self) -> Path:
        return Path(self.upload_dir)

    @staticmethod
    def _split_csv(value: str) -> list[str]:
        return [item.strip().upper() for item in value.split(",") if item.strip()]

    @property
    def demo_patient_ids(self) -> set[str]:
        return set(self._split_csv(self.demo_patients))

    @property
    def demo_doctor_ids(self) -> set[str]:
        return set(self._split_csv(self.demo_doctors))

    @property
    def demo_admin_ids(self) -> set[str]:
        return set(self._split_csv(self.demo_admins))

    @property
    def doctor_patient_assignments(self) -> dict[str, set[str]]:
        assignments: dict[str, set[str]] = {}
        for item in self.demo_doctor_patient_ids.split(";"):
            if not item.strip() or ":" not in item:
                continue
            doctor_id, patient_ids = item.split(":", 1)
            doctor_id = doctor_id.strip().upper()
            assignments[doctor_id] = set(self._split_csv(patient_ids))
        return assignments


@lru_cache
def get_settings() -> Settings:
    return Settings()


def validate_security_settings(settings: Settings) -> None:
    """Refuse to start when the deployment would issue forgeable tokens.

    There is deliberately no override flag: a bypass switch in production is the
    exact failure mode this guard exists to prevent.
    """
    if settings.auth_secret_key == DEFAULT_AUTH_SECRET_KEY:
        raise RuntimeError(
            "AUTH_SECRET_KEY is still the shipped default. Set a unique secret "
            "(e.g. `python -c \"import secrets; print(secrets.token_urlsafe(48))\"`) before starting."
        )
    if len(settings.auth_secret_key) < settings.min_auth_secret_length:
        raise RuntimeError(
            f"AUTH_SECRET_KEY must be at least {settings.min_auth_secret_length} characters; "
            f"got {len(settings.auth_secret_key)}."
        )
