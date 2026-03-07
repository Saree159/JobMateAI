# Root-level conftest so that test_api.py (in backend/) gets the same
# isolated-DB fixture that tests/ uses.
from tests.conftest import client, make_user, login, auth_headers  # noqa: F401
