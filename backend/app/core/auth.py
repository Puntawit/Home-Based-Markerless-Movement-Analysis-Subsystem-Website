from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, status


@dataclass(frozen=True)
class CurrentUser:
    id: str
    role: str
    display_name: str


MOCK_USERS = {
    "mock-token-patient-7712": CurrentUser(
        id="PATIENT-7712",
        role="patient",
        display_name="Patient-7712",
    ),
    "mock-token-doctor-demo": CurrentUser(
        id="DOCTOR-DEMO",
        role="doctor",
        display_name="Dr. Demo",
    ),
}


def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token.",
        )

    token = authorization.removeprefix("Bearer ").strip()
    user = MOCK_USERS.get(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mock token.",
        )
    return user


def require_patient(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "patient":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient role required.")
    return user


def require_doctor(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "doctor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Doctor role required.")
    return user
