import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import dotenv from "dotenv";
import fs from "fs";
import Papa from "papaparse";

dotenv.config();

const credential = new ClientSecretCredential(
  process.env.TENANT_ID,
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET
);

const client = Client.initWithMiddleware({
  authProvider: {
    getAccessToken: async () => {
      const token = await credential.getToken("https://graph.microsoft.com/.default");
      return token.token;
    },
  },
});

async function main() {
  try {
    // 1️⃣ Graph API에서 최신 사용자 덤프
    const res = await client
      .api("/users")
      .select("id,displayName,jobTitle,department,mail")
      .top(999)
      .get();

    const newUsers = res.value;

    // 2️⃣ 기존 CSV 불러오기
    let oldUsers = [];
    if (fs.existsSync("users.csv")) {
      const csvData = fs.readFileSync("users.csv", "utf8");
      const parsed = Papa.parse(csvData, { header: true });
      oldUsers = parsed.data.filter(u => u.id); // 빈 줄 제거
    }
    // oldUsers를 이름(key)→레코드로 빠르게 조회할 수 있게 Map으로 변환
    const oldMap = Object.fromEntries(
      oldUsers.map(u => [u.이름, u])
    );

    // 3️⃣ 덤프와 기존을 id로 머지
    const merged = [];    

    newUsers.forEach((newUser) => {
      // 법인, 팀 분리
      const dept = newUser.department || "";
      const corpMatch = dept.match(/\((.*?)\)/);
      const corp = corpMatch ? corpMatch[1] : "";
      const team = dept.replace(/\(.*?\)/, "").trim();

    // ① 수기 입력(oldMap)에 있으면 그 값을 그대로 쓰고
    // ② 없으면 manager_id도 없으므로 id도 빈 문자열로
      let id, manager_id;
      if (oldMap[newUser.displayName]) {
        id         = oldMap[newUser.displayName].id;
        manager_id = oldMap[newUser.displayName].manager_id;
      } else {
        id         = "";
        manager_id = "";
      }

      merged.push({
        id,
        이름: newUser.displayName,
        직책: newUser.jobTitle || "",
        법인: corp,
        팀: team,
        manager_id,
        이메일: newUser.mail || "",
     });
    });

    // 4️⃣ CSV 만들기
    const csv = Papa.unparse(merged, { header: true });

    // BOM 붙여서 저장 (한글 안 깨짐)
    fs.writeFileSync("users.csv", '\uFEFF' + csv, "utf8");
    console.log("✅ 머지된 users.csv 저장 완료!");
  } catch (err) {
    console.error(err);
  }
}

main();
