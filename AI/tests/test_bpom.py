import unittest
from unittest import mock
from uuid import uuid4

from app import bpom, scoring
from app.bpom import BpomVerification
from app.schemas import AnalysisRequest


def _request(bpom_number: str | None) -> AnalysisRequest:
    return AnalysisRequest.model_validate({
        "scanId": str(uuid4()),
        "input": {"method": "manual", "ingredientsText": "Aqua, Glycerin", "bpomNumber": bpom_number},
        "profile": {"skinType": "normal", "sensitivityLevel": "medium", "conditions": [], "concerns": [], "pregnancyStatus": "none", "currentRoutine": []},
    })


class BpomVerificationTests(unittest.TestCase):
    def setUp(self) -> None:
        bpom._verify_cached.cache_clear()

    def test_invalid_format_skips_network(self) -> None:
        with mock.patch.object(bpom, "_fetch", side_effect=AssertionError("no network")):
            score, valid, verification = scoring._bpom_score("invalid-number")
        self.assertEqual((score, valid, verification), (10, False, None))

    def test_proxy_parses_active_registration(self) -> None:
        body = '{"found": true, "status": "ACTIVE", "result": {"product_name": "Serum X"}}'
        with mock.patch.dict("os.environ", {"BPOM_VERIFY_URL": "http://proxy/bpom/check/{number}"}), \
                mock.patch.object(bpom, "_fetch", return_value=(200, body)) as fetch:
            result = bpom.verify_bpom("NA 1122-3344-556")
        fetch.assert_called_once()
        self.assertTrue(result.checked and result.found)
        self.assertIs(result.active, True)
        self.assertEqual(result.product_name, "Serum X")

    def test_network_failure_is_unchecked(self) -> None:
        with mock.patch.object(bpom, "_fetch", side_effect=OSError("blocked")):
            result = bpom.verify_bpom("NA11223344556")
        self.assertFalse(result.checked)

    def test_verified_active_has_no_registration_finding(self) -> None:
        verified = BpomVerification("NA11223344556", checked=True, found=True, active=True, product_name=None, source="proxy")
        with mock.patch.object(scoring, "verify_bpom", return_value=verified):
            result = scoring.analyze(_request("NA11223344556"))
        codes = {finding.code for finding in result.report.findings}
        self.assertNotIn("BPOM_NOT_REGISTERED", codes)
        self.assertEqual(result.report.sub_scores["bpomTrust"], 30)

    def test_not_registered_flags_finding(self) -> None:
        missing = BpomVerification("NA11223344556", checked=True, found=False, active=None, product_name=None, source="proxy")
        with mock.patch.object(scoring, "verify_bpom", return_value=missing):
            result = scoring.analyze(_request("NA11223344556"))
        codes = {finding.code for finding in result.report.findings}
        self.assertIn("BPOM_NOT_REGISTERED", codes)


class BpomSearchTests(unittest.TestCase):
    def setUp(self) -> None:
        bpom._search_cached.cache_clear()

    def test_short_query_skips_network(self) -> None:
        with mock.patch.object(bpom, "_fetch", side_effect=AssertionError("no network")):
            self.assertEqual(bpom.search_bpom("ab"), [])

    def test_no_proxy_returns_empty(self) -> None:
        with mock.patch.dict("os.environ", {}, clear=False):
            import os
            os.environ.pop("BPOM_SEARCH_URL", None)
            with mock.patch.object(bpom, "_fetch", side_effect=AssertionError("no network")):
                self.assertEqual(bpom.search_bpom("vitamin c serum"), [])

    def test_parses_nested_and_flat_items(self) -> None:
        body = (
            '{"results": ['
            '{"result": {"product_name": "Serum A", "registration_status": "ACTIVE"}, "number": "NA11111111111", "registrant": "PT A"},'
            '{"nama_produk": "Krim B", "nomor_notifikasi": "NB22222222222", "status": "TIDAK AKTIF", "komposisi": "Aqua, Glycerin"}'
            ']}'
        )
        with mock.patch.dict("os.environ", {"BPOM_SEARCH_URL": "http://proxy/bpom/search?q={query}"}), \
                mock.patch.object(bpom, "_fetch", return_value=(200, body)) as fetch:
            items = bpom.search_bpom("serum", limit=10)
        fetch.assert_called_once()
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0].number, "NA11111111111")
        self.assertEqual(items[0].product_name, "Serum A")
        self.assertIs(items[0].active, True)
        self.assertEqual(items[1].registrant, None)
        self.assertEqual(items[1].composition, "Aqua, Glycerin")
        self.assertIs(items[1].active, False)

    def test_network_failure_returns_empty(self) -> None:
        with mock.patch.dict("os.environ", {"BPOM_SEARCH_URL": "http://proxy/bpom/search?q={query}"}), \
                mock.patch.object(bpom, "_fetch", side_effect=OSError("blocked")):
            self.assertEqual(bpom.search_bpom("serum wajah"), [])


if __name__ == "__main__":
    unittest.main()
