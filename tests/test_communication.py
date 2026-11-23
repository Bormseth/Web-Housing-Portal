"""Run from the project folder: python -m unittest discover -s tests -v"""
import os
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
from housing_api import app


class CommunicationTests(unittest.TestCase):
    def setUp(self):
        self.directory = TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.environment = patch.dict(os.environ, {"RA_DB_PATH": str(Path(self.directory.name) / "portal.sqlite3")})
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)
        self.headers = {"X-RA-Session": str(uuid4())}
        self.other = {"X-RA-Session": str(uuid4())}

    def request(self, method, path, data=None, headers=None):
        return self.client.request(method, path, json=data, headers=headers or self.headers)

    def save_profile(self, **changes):
        data = {"full_name": "Demo Student", "contact_method": "Portal messages",
                "communication_notes": "Please use written messages."}
        return self.request("PUT", "/profile", {**data, **changes})

    def maintenance(self, **changes):
        data = {"type": "Private", "item": "Desk chair", "room": "Mills 237",
                "room_type": "Double", "description": "One chair leg is loose.",
                "communication_notes": "Please message before arriving."}
        return self.request("POST", "/add-maintenance-request", {**data, **changes})

    def message(self, **changes):
        return self.request("POST", "/messages", {"topic": "Housing", "subject": "Room question",
                                                   "body": "Can I request a quiet floor?", **changes})

    def test_profile_and_messages_survive_a_new_client(self):
        self.assertEqual(self.save_profile().status_code, 200)
        thread = self.message().json()
        self.assertEqual(thread["contact"]["communication_notes"], "Please use written messages.")
        self.assertEqual(self.request("POST", f'/messages/{thread["id"]}/reply', {"body": "Please reply in writing."}).status_code, 200)
        with TestClient(app) as restarted:
            self.assertEqual(restarted.get("/profile", headers=self.headers).json()["full_name"], "Demo Student")
            saved = restarted.get("/messages", headers=self.headers).json()
            self.assertEqual(len(saved[0]["messages"]), 2)
            self.assertEqual(saved[0]["messages"][1]["body"], "Please reply in writing.")

    def test_maintenance_saves_comments_preferences_and_followup(self):
        self.save_profile()
        response = self.maintenance(comments="Afternoons are best.", contact_method="Email", email="demo@example.com")
        self.assertEqual(response.status_code, 200)
        saved = response.json()["request"]
        self.assertEqual(saved["status"], "Pending")
        self.assertEqual(saved["comments"], "Afternoons are best.")
        self.assertEqual(self.request("GET", "/maintenance-requests").json()[0], saved)
        thread = self.request("GET", "/messages").json()[0]
        self.assertEqual(thread["id"], saved["message_id"])
        self.assertEqual(thread["contact"]["email"], "demo@example.com")
        self.assertEqual(self.request("GET", "/profile").json()["contact_method"], "Portal messages")

    def test_sessions_cannot_read_or_reply_to_each_others_records(self):
        self.save_profile()
        saved = self.maintenance(type="Public").json()["request"]
        self.assertEqual(self.request("GET", "/messages", headers=self.other).json(), [])
        self.assertEqual(self.request("GET", "/profile", headers=self.other).json()["full_name"], "")
        self.assertEqual(len(self.request("GET", "/maintenance-requests", headers=self.other).json()), 3)
        self.assertEqual(self.request("POST", f'/messages/{saved["message_id"]}/reply', {"body": "Try another session"}, self.other).status_code, 404)

    def test_contact_requirements_follow_the_selected_method(self):
        self.assertEqual(self.save_profile().status_code, 200)
        self.assertEqual(self.save_profile(contact_method="Email").status_code, 422)
        self.assertEqual(self.save_profile(contact_method="Email", email="bad address").status_code, 422)
        self.assertEqual(self.save_profile(contact_method="Email", email="demo@example.com").status_code, 200)
        self.assertEqual(self.save_profile(contact_method="Phone call").status_code, 422)
        self.assertEqual(self.save_profile(contact_method="Phone call", phone="555-0100").status_code, 200)
        self.assertEqual(self.maintenance(contact_method="Email").status_code, 422)
        self.assertEqual(len(self.request("GET", "/maintenance-requests").json()), 3)
        self.assertEqual(self.request("GET", "/messages").json(), [])

    def test_blank_and_overlong_messages_are_rejected(self):
        for changes in [{"subject": "   "}, {"body": "\n "}, {"body": "a" * 4001}, {"topic": "Unknown"}]:
            self.assertEqual(self.message(**changes).status_code, 422)
        self.assertEqual(self.maintenance(description="   ").status_code, 422)
        self.assertEqual(self.request("GET", "/messages").json(), [])

    def test_existing_ra_housing_and_meal_plan_routes_still_work(self):
        self.assertEqual(len(self.request("GET", "/housing-options").json()), 34)
        self.assertEqual(self.request("GET", "/ra/application").json()["status"], "not_started")
        self.assertEqual(self.request("GET", "/housing-applications/2026-2027").status_code, 200)
        self.assertEqual(self.request("GET", "/meal-plans/2026-2027/selection").status_code, 200)


if __name__ == "__main__":
    unittest.main()
