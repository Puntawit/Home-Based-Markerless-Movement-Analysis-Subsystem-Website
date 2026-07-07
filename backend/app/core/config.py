from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    database_name: str = "movement_analysis"
    upload_dir: str = "uploads"
    frontend_origin: str = "http://localhost:5173"
    auth_secret_key: str = "change-this-demo-secret-before-sharing"
    access_token_ttl_minutes: int = 60
    playback_token_ttl_minutes: int = 5
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
