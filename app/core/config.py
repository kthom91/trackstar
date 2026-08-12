from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "TrackStar API"
    DATABASE_URL: str = "sqlite:///./data/media_tracker.db"
    SETLIST_FM_API_KEY: str = ""
    SETLIST_FM_USER_ID: str = ""
    TMDB_API_KEY: str = ""
    LETTERBOXD_RSS_URL: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
