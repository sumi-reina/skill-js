/**
 * e-Stat API(v3.0)
 *
 * 概要:
 *   ・e-Stat API からデータを取得する fetchPopulationData()
 *   ・APIレスポンスを表示用データ構造に変換する buildPopulationTable()
 *   ・対象の都県コードと都県名の対応マップ KANTO_PREFECTURES
 *
 * APIキーについて:
 *   ソースコードにAPIキーをハードコードするとリポジトリ公開時に漏洩するため、
 *   URLクエリパラメータ（?appId=xxx）から受け取る設計にしている。
 */


// 使用する統計表ID: 社会・人口統計体系 都道府県データ
const STATS_DATA_ID = "0000010201";

// e-Stat APIのURL
const BASE_URL = "https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData";

/**
 * 対象都県のe-Stat地域コードと都県名の対応マップ
 *
 * 地域コードはJIS X 0401の都道府県コード末尾に"000"を付加した形式
 * 例：東京都 = 13 → "13000"
 */
export const KANTO_PREFECTURES = {
  "13000": "東京都",
  "14000": "神奈川県",
  "11000": "埼玉県",
  "12000": "千葉県",
  "08000": "茨城県",
  "09000": "栃木県",
  "10000": "群馬県",
  "19000": "山梨県",
};

/**
 * e-Stat APIから首都圏の総人口データを取得する
 *
 * @param {string} appId - e-Stat APIキー
 * @returns {Promise<object>} - APIレスポンスのGET_STATS_DATAオブジェクト
 * @throws {Error} - APIキー未指定・通信エラー・APIステータスエラー時
 */
export async function fetchPopulationData(appId) {
  if (!appId) {
    throw new Error("APIキーが指定されていません。URLに ?appId=xxx を追加してください。");
  }

  // URLSearchParamsはカンマを%2Cにエンコードするため、cdCat01とcdAreaは手動でクエリ文字列に追記
  const areaCodes = Object.keys(KANTO_PREFECTURES).join(",");
  const params = new URLSearchParams({
    appId,
    lang: "J",
    statsDataId: STATS_DATA_ID,
    metaGetFlg: "Y", // メタ情報を取得する
    cntGetFlg: "N", // 件数取得は不要
    explanationGetFlg: "N", // 解説情報は不要
    annotationGetFlg: "N", // 注釈は不要
    sectionHeaderFlg: "1",
    replaceSpChars: "0",
  });

  // cdCat01: 総人口の統計カテゴリコード (#A011000)
  const url = `${BASE_URL}?${params.toString()}&cdCat01=%23A011000&cdArea=${areaCodes}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP エラー: ${res.status}`);
  }

  const json = await res.json();

  // e-Stat APIは結果コード0以外はデータなし/エラー
  const result = json?.GET_STATS_DATA?.RESULT;
  if (result?.STATUS !== 0) {
    throw new Error(`e-Stat APIエラー: ${result?.ERROR_MSG}`);
  }

  return json.GET_STATS_DATA;
}

/**
 * APIレスポンスを表に変換する
 *
 * @param {object} statsData - fetchPopulationData()の戻り値
 * @returns {{
 *   years: string[],
 *   prefs: string[],
 *   table: Object.<string, Object.<string, string>>
 * }}
 *   - years: 西暦の配列(降順)
 *   - prefs: 都県コードの配列(KANTO_PREFECTURES のキー順)
 *   - table: table[西暦][都県コード] = 人口値（万人）の文字列
 */
export function buildPopulationTable(statsData) {
  const raw = statsData?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? [];
  const values = Array.isArray(raw) ? raw : [raw];

  if (values.length === 0) {
    throw new Error("人口データが取得できませんでした。");
  }

  // table[西暦][都県コード] = 人口値の形に集約する
  const table = {};
  for (const v of values) {
    const year = v["@time"].slice(0, 4); // "@time"は"1996100000"形式 → 先頭4桁が西暦
    const area = v["@area"];             // 都県コード 例: "13000"
    if (!table[year]) table[year] = {};
    table[year][area] = v["$"];          // "$"に人口値が格納されている
  }

  const years = Object.keys(table).sort((a, b) => Number(b) - Number(a)); // 降順にソート
  const prefs = Object.keys(KANTO_PREFECTURES);

  return { years, prefs, table };
}