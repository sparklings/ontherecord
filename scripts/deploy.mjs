// 빌드 결과를 시험용 vault의 플러그인 폴더에 복사한다. 개발자 전용 스크립트이며 배포물에 포함되지 않는다.
// 대상 vault: 환경 변수 OTR_TEST_VAULT, 없으면 %USERPROFILE%\OneDrive\PlugVaults
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const PLUGIN_ID = JSON.parse(fs.readFileSync("manifest.json", "utf8")).id;
const FILES = ["main.js", "manifest.json", "styles.css"];
const OPTIONAL = new Set(["styles.css"]);
// 업무용 vault로 복사되는 것을 막는다.
const FORBIDDEN = /ObsidianVaults/i;

const vault = path.resolve(
	process.env.OTR_TEST_VAULT ||
		path.join(process.env.USERPROFILE || "", "OneDrive", "PlugVaults"),
);

function fail(message) {
	console.error(`[deploy] ${message}`);
	process.exit(1);
}

if (FORBIDDEN.test(vault)) fail(`금지된 대상 경로: ${vault}`);
if (!fs.existsSync(path.join(vault, ".obsidian"))) {
	fail(`Obsidian vault가 아님(.obsidian 없음): ${vault}`);
}

console.log("[deploy] build");
execFileSync(process.execPath, ["esbuild.config.mjs", "production"], { stdio: "inherit" });

const dest = path.join(vault, ".obsidian", "plugins", PLUGIN_ID);
fs.mkdirSync(dest, { recursive: true });

for (const file of FILES) {
	if (!fs.existsSync(file)) {
		if (OPTIONAL.has(file)) continue;
		fail(`필수 파일 없음: ${file}`);
	}
	fs.copyFileSync(file, path.join(dest, file));
	console.log(`[deploy] ${file} -> ${dest}`);
}

const listPath = path.join(vault, ".obsidian", "community-plugins.json");
const enabled = fs.existsSync(listPath) && JSON.parse(fs.readFileSync(listPath, "utf8")).includes(PLUGIN_ID);
console.log(
	enabled
		? "[deploy] 완료. Obsidian에서 플러그인을 비활성화 후 다시 활성화하거나 앱을 다시 불러온다."
		: "[deploy] 완료. Obsidian 설정 > 커뮤니티 플러그인에서 플러그인을 활성화한다(이 스크립트는 활성화 목록을 수정하지 않는다).",
);
