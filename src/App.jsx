/**
 * 首都圏の総人口をグルーピングして表示するコンポーネント
 *
 * 概要:
 *   ・e-Stat APIから対象の都県の総人口データを取得し、表形式で表示する
 *      - 横軸: 都県名、縦軸: 西暦（降順）
 *   ・友好度CSVをもとに都県を最大3グループに分け、色分けする
 *
 * APIキーについて:
 *   URL：クエリパラメータ?appId=xxxで指定する。
 *
 */

import { useEffect, useState } from "react";
import { fetchPopulationData, buildPopulationTable, KANTO_PREFECTURES } from "./api/estatApi";
import { parseAffinityCSV } from "./utils/csvParser";
import { findBestGrouping } from "./utils/grouping";

// グループごとの背景色(最大3グループ)
const GROUP_COLORS = ["#FF4500", "#FFA500", "#87CEFA"];

// 友好度CSVのパス(publicフォルダ直下)
const CSV_PATH = "/sample.csv";

/**
 * 人口データとグルーピング結果をまとめて取得するカスタムフック
 *
 * @param {string} appId - e-Stat APIキー
 * @returns {{
 *   loading: boolean,
 *   error: string | null,
 *   tableData: { years: string[], prefs: string[], table: object } | null,
 *   groups: string[][],
 *   totalScore: number | null
 * }}
 */
function usePopulationData(appId) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [groups, setGroups] = useState([]);
  const [totalScore, setTotalScore] = useState(null);

  useEffect(() => {
    // appIdが空の場合はAPI呼び出しをおこなわない
    if (!appId) {
      setLoading(false);
      return;
    }

    Promise.all([
      fetchPopulationData(appId),
      fetch(CSV_PATH).then((res) => res.text()),
    ])
      .then(([statsData, csvText]) => {
        setTableData(buildPopulationTable(statsData));
        const { prefs, scores } = parseAffinityCSV(csvText);
        const result = findBestGrouping(prefs, scores);
        setGroups(result.groups);
        setTotalScore(result.totalScore);
      })
      .catch((err) => {
        console.error("[usePopulationData] データ取得エラー:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [appId]);

  return { loading, error, tableData, groups, totalScore };
}

/**
 * アプリケーションのコンポーネント
 * URLクエリパラメータからappIdを取得し、人口表とグルーピング結果を表示する
 */
export default function App() {
  // URLクエリパラメータからAPIキーを取得(未指定の場合は空文字)
  const appId = new URLSearchParams(window.location.search).get("appId") ?? "";

  const { loading, error, tableData, groups, totalScore } =
    usePopulationData(appId);

  // APIキー未指定の場合、フェッチはおこなわず案内を表示する
  if (!appId) {
    return (
      <div style={styles.container}>
        <h1>首都圏 総人口（万人）</h1>
        <p>URLに <code>?appId=API_KEY</code> を追加してアクセスしてください。</p>
        <p>例: <code>{window.location.href}?appId=API_KEY</code></p>
      </div>
    );
  }

  if (loading) return <p style={{ padding: "2rem" }}>取得中...</p>;

  if (error) {
    return (
      <div style={styles.container}>
        <p style={{ color: "red" }}>エラー: {error}</p>
        <button onClick={() => window.location.reload()}>再読み込み</button>
      </div>
    );
  }

  const { years, table } = tableData;

  // グループ番号を都県名にマッピングするための辞書を作成
  const nameToGroupIndex = {};
  groups.forEach((group, i) => group.forEach((name) => (nameToGroupIndex[name] = i)));

  // 表の列をグループ順に並べ替えた都県コードリスト
  const sortedCodes = Object.entries(KANTO_PREFECTURES)
    .sort(([, nameA], [, nameB]) => (nameToGroupIndex[nameA] ?? 99) - (nameToGroupIndex[nameB] ?? 99))
    .map(([code]) => code);

  return (
    <div style={styles.container}>
      <h1>首都圏 総人口（万人）</h1>

      {/* グルーピング結果 */}
      <div style={{ marginBottom: "1rem" }}>
        <strong>友好度合計: {totalScore}</strong>
        {groups.map((group, i) => (
          <span key={i} style={{ ...styles.groupBadge, background: GROUP_COLORS[i] }}>
            グループ{i + 1}: {group.join("・")}
          </span>
        ))}
      </div>

      {/* 人口表（グループ別色分け） */}
      <div style={{ overflowX: "auto" }}>
        <table border="1" cellPadding="6" style={styles.table}>
          <thead>
            <tr>
              <th>西暦</th>
              {sortedCodes.map((code) => {
                const name = KANTO_PREFECTURES[code];
                return (
                  <th key={code} style={{ background: GROUP_COLORS[nameToGroupIndex[name]] ?? "transparent" }}>
                    {name}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {years.map((year) => (
              <tr key={year}>
                <td>{year}</td>
                {sortedCodes.map((code) => {
                  const name = KANTO_PREFECTURES[code];
                  return (
                    <td key={code} style={{ background: GROUP_COLORS[nameToGroupIndex[name]] ?? "transparent" }}>
                      {table[year]?.[code] ?? "-"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* e-Stat APIクレジット表示（利用規約に基づく必須表記） */}
      <footer style={{ marginTop: "2rem", fontSize: "0.8rem", color: "#555" }}>
        このサービスは、政府統計総合窓口(e-Stat)のAPI機能を使用していますが、サービスの内容は国によって保証されたものではありません。
      </footer>
    </div>
  );
}

/** コンポーネント内で使用するインラインスタイル定数 */
const styles = {
  container: {
    padding: "2rem",
    fontFamily: "sans-serif",
    background: "#ffffff",
    color: "#000000",
    minHeight: "100vh",
  },
  groupBadge: {
    marginLeft: "1rem",
    padding: "2px 8px",
    borderRadius: "4px",
  },
  table: {
    borderCollapse: "collapse",
  },
};