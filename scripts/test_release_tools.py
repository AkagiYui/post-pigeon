import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parent))

import extract_changelog  # noqa: E402
import release_range  # noqa: E402


SAMPLE = """# 变更日志

## [未发布]

## [1.2.0] - 2026-08-30

### 新增

- 正式版新增

## [1.2.0-rc.1] - 2026-08-29

### 修复

- RC 修复

## [1.2.0-beta.1] - 2026-08-28

### 新增

- Beta 新增

## [1.1.0] - 2026-08-01

### 变更

- 上一个正式版
"""


class ReleaseRangeTests(unittest.TestCase):
    def test_stable_release_ignores_prerelease_tags(self):
        tags = ["v1.1.0", "v1.2.0-beta.1", "v1.2.0-rc.1"]
        self.assertEqual(release_range.select_previous("v1.2.0", tags), "v1.1.0")

    def test_prerelease_uses_previous_semver(self):
        tags = ["v1.1.0", "v1.2.0-beta.1", "v1.2.0-beta.2"]
        self.assertEqual(
            release_range.select_previous("v1.2.0-rc.1", tags),
            "v1.2.0-beta.2",
        )

    def test_semver_numeric_prerelease_order(self):
        self.assertLess(
            release_range.parse("1.2.0-beta.2"),
            release_range.parse("1.2.0-beta.10"),
        )


class ReleaseNotesTests(unittest.TestCase):
    def test_stable_release_includes_all_prerelease_sections(self):
        notes = extract_changelog.render_release_notes(SAMPLE, "v1.2.0", "v1.1.0")
        self.assertIn("`v1.1.0...v1.2.0`", notes)
        self.assertIn("正式版新增", notes)
        self.assertIn("v1.2.0-rc.1", notes)
        self.assertIn("RC 修复", notes)
        self.assertIn("v1.2.0-beta.1", notes)
        self.assertIn("Beta 新增", notes)
        self.assertNotIn("上一个正式版", notes)

    def test_prerelease_only_includes_its_own_section(self):
        notes = extract_changelog.render_release_notes(
            SAMPLE, "v1.2.0-rc.1", "v1.2.0-beta.1"
        )
        self.assertIn("RC 修复", notes)
        self.assertNotIn("Beta 新增", notes)
        self.assertNotIn("正式版新增", notes)

    def test_single_section_extraction_remains_compatible(self):
        notes = extract_changelog.extract(SAMPLE, "v1.2.0-beta.1")
        self.assertIn("Beta 新增", notes)
        self.assertNotIn("RC 修复", notes)


if __name__ == "__main__":
    unittest.main()
