import test from "node:test";
import * as assert from "node:assert/strict";
import { OTR_SIDEBAR_VIEW_TYPE } from "../src/sidebarTypes.ts";

test("OTR_SIDEBAR_VIEW_TYPE: 뷰 식별자 상수 검증 (3-UX-04, 3-UX-10)", () => {
	assert.equal(OTR_SIDEBAR_VIEW_TYPE, "on-the-record-sidebar-view");
});
