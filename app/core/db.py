import os
from typing import Generator
from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("sqlite:////"):
    file_path = db_url.replace("sqlite:////", "/")
elif db_url.startswith("sqlite:///"):
    file_path = db_url.replace("sqlite:///", "")
else:
    file_path = None

if file_path and file_path != ":memory:":
    dir_name = os.path.dirname(os.path.abspath(file_path))
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

def init_db() -> None:
    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
