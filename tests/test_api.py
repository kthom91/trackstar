import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session

from app.main import app
from app.core.db import get_session

from sqlmodel.pool import StaticPool

TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()

def test_healthz(client: TestClient):
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_create_and_list_log(client: TestClient):
    payload = {
        "media_type": "book",
        "title": "Dune",
        "status": "completed",
        "rating": 5,
        "review": "A sci-fi masterpiece!"
    }
    response = client.post("/api/v1/logs", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "completed"
    assert data["rating"] == 5
    assert data["media_item"]["title"] == "Dune"
    assert data["media_item"]["media_type"] == "book"

    # Test List Logs
    list_resp = client.get("/api/v1/logs?media_type=book")
    assert list_resp.status_code == 200
    logs = list_resp.json()
    assert len(logs) == 1
    assert logs[0]["media_item"]["title"] == "Dune"

def test_storygraph_csv_import(client: TestClient):
    csv_data = (
        'Title,Authors,Contributors,ISBN/UID,Format,Read Status,Date Added,Last Date Read,Dates Read,Read Count,Moods,Pace,Character- or Plot-Driven?,Strong Character Development?,Loveable Characters?,Diverse Characters?,Flawed Characters?,Star Rating,Review,Content Warnings,Content Warning Description,Tags,Owned?\n'
        'The Shining,Stephen King,"",9780450040184,paperback,to-read,2026/06/01,"","",0,"",,,,,,,,,"",,"",No\n'
        'In Cold Blood,Truman Capote,"",9780679745587,paperback,read,2015/07/22,"","",1,"",,,,,,,4.0,,"",,"",No\n'
    )
    files = {"file": ("storygraph_export.csv", csv_data, "text/csv")}
    response = client.post("/api/v1/importers/storygraph/upload", files=files)
    assert response.status_code == 200
    job = response.json()
    assert job["connector_name"] == "storygraph"
    assert job["status"] == "success"
    assert job["records_processed"] == 2

    # Verify log entries
    logs_resp = client.get("/api/v1/logs?media_type=book")
    assert logs_resp.status_code == 200
    logs = logs_resp.json()
    assert len(logs) >= 2
    cold_blood = next(l for l in logs if "In Cold Blood" in l["media_item"]["title"])
    assert cold_blood["rating"] == 4
    assert cold_blood["status"] == "completed"

def test_goodreads_csv_import(client: TestClient):

    csv_data = (
        'Book Id,Title,Author,ISBN,ISBN13,My Rating,Average Rating,Publisher,Binding,Number of Pages,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Bookshelves with positions,Exclusive Shelf,My Review,Spoilers,Notes,Read Count,Owned Copies\n'
        '12345,The Hobbit,J.R.R. Tolkien,"=""9780007525492""","=""9780007525492""",5,4.28,HarperCollins,Paperback,300,2012,1937,2024/01/15,2024/01/01,,,"read","Amazing adventure!",,,1,0\n'
    )
    files = {"file": ("goodreads_export.csv", csv_data, "text/csv")}
    response = client.post("/api/v1/importers/goodreads/upload", files=files)
    assert response.status_code == 200
    job = response.json()
    assert job["connector_name"] == "goodreads"
    assert job["status"] == "success"
    assert job["records_processed"] == 1

    # Verify log entry in DB
    logs_resp = client.get("/api/v1/logs?media_type=book")
    assert logs_resp.status_code == 200
    logs = logs_resp.json()
    assert len(logs) >= 1
    hobbit_log = next(l for l in logs if "Hobbit" in l["media_item"]["title"])
    assert hobbit_log["rating"] == 5
    assert hobbit_log["status"] == "completed"

def test_letterboxd_csv_import(client: TestClient):
    csv_data = (
        'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags\n'
        '2024-02-10,Spirited Away,2001,https://boxd.it/2al8,5,Yes,"animation, favorite"\n'
    )
    files = {"file": ("watched.csv", csv_data, "text/csv")}
    response = client.post("/api/v1/importers/letterboxd/upload", files=files)
    assert response.status_code == 200
    job = response.json()
    assert job["connector_name"] == "letterboxd_csv"
    assert job["status"] == "success"

    # Verify movie log in DB
    logs_resp = client.get("/api/v1/logs?media_type=movie")
    assert logs_resp.status_code == 200
    movies = logs_resp.json()
    assert len(movies) >= 1
    spirited = next(m for m in movies if "Spirited Away" in m["media_item"]["title"])
    assert spirited["rating"] == 5

def test_sync_jobs_list(client: TestClient):
    response = client.get("/api/v1/sync/jobs")
    assert response.status_code == 200
    jobs = response.json()
    assert isinstance(jobs, list)
