import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import Papa from "papaparse";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import "./styles.css";

function App() {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  // -----------------------------
  // COLUMN DETECTION
  // -----------------------------

  const columns = useMemo(() => {
    if (!rows.length) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  const numericColumns = useMemo(() => {
    return columns.filter((column) => {
      const values = rows
        .map((row) => {
          const value = String(row[column] ?? "")
            .replace(/,/g, "")
            .trim();

          return Number(value);
        })
        .filter((value) => !Number.isNaN(value));

      return (
        values.length >=
        Math.max(2, rows.length * 0.5)
      );
    });
  }, [columns, rows]);

  const textColumns = useMemo(() => {
    return columns.filter(
      (column) => !numericColumns.includes(column)
    );
  }, [columns, numericColumns]);

  // -----------------------------
  // IMPORTANT COLUMN DETECTION
  // -----------------------------

  const revenueColumn = useMemo(() => {
    const keywords = [
      "revenue",
      "sales",
      "amount",
      "price",
      "income",
      "profit",
      "total",
      "spend",
      "cost",
      "value",
    ];

    return (
      numericColumns.find((column) =>
        keywords.some((word) =>
          column.toLowerCase().includes(word)
        )
      ) || numericColumns[0]
    );
  }, [numericColumns]);

  const quantityColumn = useMemo(() => {
    const keywords = [
      "quantity",
      "qty",
      "units",
      "count",
      "number",
    ];

    return numericColumns.find((column) =>
      keywords.some((word) =>
        column.toLowerCase().includes(word)
      )
    );
  }, [numericColumns]);

  const groupColumn = useMemo(() => {
    const keywords = [
      "product",
      "category",
      "region",
      "country",
      "city",
      "department",
      "type",
      "segment",
      "brand",
      "name",
    ];

    return (
      textColumns.find((column) =>
        keywords.some((word) =>
          column.toLowerCase().includes(word)
        )
      ) || textColumns[0]
    );
  }, [textColumns]);

  // -----------------------------
  // BASIC DATA STATISTICS
  // -----------------------------

  const totalRevenue = useMemo(() => {
    if (!revenueColumn) return 0;

    return rows.reduce((sum, row) => {
      const value = Number(
        String(row[revenueColumn] ?? "")
          .replace(/,/g, "")
          .trim()
      );

      return sum + (Number.isNaN(value) ? 0 : value);
    }, 0);
  }, [rows, revenueColumn]);

  const totalUnits = useMemo(() => {
    if (!quantityColumn) return null;

    return rows.reduce((sum, row) => {
      const value = Number(
        String(row[quantityColumn] ?? "")
          .replace(/,/g, "")
          .trim()
      );

      return sum + (Number.isNaN(value) ? 0 : value);
    }, 0);
  }, [rows, quantityColumn]);

  const missingCells = useMemo(() => {
    if (!rows.length || !columns.length) return 0;

    return rows.reduce((total, row) => {
      return (
        total +
        columns.filter((column) => {
          const value = row[column];

          return (
            value === undefined ||
            value === null ||
            String(value).trim() === ""
          );
        }).length
      );
    }, 0);
  }, [rows, columns]);

  const totalCells = rows.length * columns.length;

  const qualityScore = useMemo(() => {
    if (!totalCells) return 0;

    return Math.round(
      ((totalCells - missingCells) / totalCells) * 100
    );
  }, [totalCells, missingCells]);

  // -----------------------------
  // NUMERIC STATISTICS
  // -----------------------------

  const numericStats = useMemo(() => {
    return numericColumns.map((column) => {
      const values = rows
        .map((row) =>
          Number(
            String(row[column] ?? "")
              .replace(/,/g, "")
              .trim()
          )
        )
        .filter((value) => !Number.isNaN(value));

      if (!values.length) {
        return {
          column,
          count: 0,
          average: 0,
          minimum: 0,
          maximum: 0,
          sum: 0,
        };
      }

      const sum = values.reduce(
        (a, b) => a + b,
        0
      );

      return {
        column,
        count: values.length,
        average: sum / values.length,
        minimum: Math.min(...values),
        maximum: Math.max(...values),
        sum,
      };
    });
  }, [rows, numericColumns]);

  // -----------------------------
  // CATEGORY / GROUP DATA
  // -----------------------------

  const groupData = useMemo(() => {
    if (!groupColumn || !revenueColumn) {
      return [];
    }

    const grouped = {};

    rows.forEach((row) => {
      const group =
        String(row[groupColumn] ?? "Unknown").trim() ||
        "Unknown";

      const value = Number(
        String(row[revenueColumn] ?? "")
          .replace(/,/g, "")
          .trim()
      );

      if (!Number.isNaN(value)) {
        grouped[group] =
          (grouped[group] || 0) + value;
      }
    });

    return Object.entries(grouped)
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [rows, groupColumn, revenueColumn]);

  // -----------------------------
  // SECOND CHART DATA
  // -----------------------------

  const numericChartData = useMemo(() => {
    if (!revenueColumn) return [];

    const values = rows
      .map((row, index) => {
        const value = Number(
          String(row[revenueColumn] ?? "")
            .replace(/,/g, "")
            .trim()
        );

        if (Number.isNaN(value)) return null;

        return {
          name: `Row ${index + 1}`,
          value,
        };
      })
      .filter(Boolean)
      .slice(0, 20);

    return values;
  }, [rows, revenueColumn]);

  // -----------------------------
  // AUTOMATIC EXPLANATION
  // -----------------------------

  const insights = useMemo(() => {
    if (!rows.length) return [];

    const results = [];

    results.push(
      `The dataset contains ${rows.length.toLocaleString()} records across ${columns.length} columns.`
    );

    if (numericColumns.length) {
      results.push(
        `${numericColumns.length} numeric field${
          numericColumns.length === 1 ? "" : "s"
        } were detected: ${numericColumns.join(", ")}.`
      );
    }

    if (textColumns.length) {
      results.push(
        `${textColumns.length} categorical/text field${
          textColumns.length === 1 ? "" : "s"
        } were detected: ${textColumns.join(", ")}.`
      );
    }

    if (revenueColumn) {
      const stat = numericStats.find(
        (item) => item.column === revenueColumn
      );

      if (stat) {
        results.push(
          `"${revenueColumn}" has a total of ${stat.sum.toLocaleString(
            undefined,
            { maximumFractionDigits: 2 }
          )}, an average of ${stat.average.toLocaleString(
            undefined,
            { maximumFractionDigits: 2 }
          )}, a minimum of ${stat.minimum.toLocaleString(
            undefined,
            { maximumFractionDigits: 2 }
          )}, and a maximum of ${stat.maximum.toLocaleString(
            undefined,
            { maximumFractionDigits: 2 }
          )}.`
        );
      }
    }

    if (
      quantityColumn &&
      totalUnits !== null
    ) {
      results.push(
        `"${quantityColumn}" contains a total of ${totalUnits.toLocaleString()} units/records.`
      );
    }

    if (groupColumn && groupData.length) {
      const highest = groupData[0];
      const lowest =
        groupData[groupData.length - 1];

      results.push(
        `"${highest.name}" is the highest-value ${groupColumn.toLowerCase()} based on "${revenueColumn}", with ${highest.value.toLocaleString()}.`
      );

      if (groupData.length > 1) {
        results.push(
          `"${lowest.name}" has the lowest value among the displayed groups, at ${lowest.value.toLocaleString()}.`
        );
      }
    }

    if (missingCells === 0) {
      results.push(
        "No missing cells were detected. The dataset appears complete."
      );
    } else {
      results.push(
        `${missingCells.toLocaleString()} missing cells were detected. These values should be reviewed before advanced analysis.`
      );
    }

    if (qualityScore >= 95) {
      results.push(
        `Overall data quality is ${qualityScore}%, which indicates a highly complete dataset.`
      );
    } else if (qualityScore >= 80) {
      results.push(
        `Overall data quality is ${qualityScore}%. Some cleaning may improve the dataset.`
      );
    } else {
      results.push(
        `Overall data quality is ${qualityScore}%. Consider cleaning missing or incomplete values before relying on the analysis.`
      );
    }

    return results;
  }, [
    rows,
    columns,
    numericColumns,
    textColumns,
    revenueColumn,
    quantityColumn,
    totalUnits,
    numericStats,
    groupColumn,
    groupData,
    missingCells,
    qualityScore,
  ]);

  // -----------------------------
  // CSV UPLOAD
  // -----------------------------

  function handleFile(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");
    setRows([]);
    setFileName("");

    if (
      !file.name
        .toLowerCase()
        .endsWith(".csv")
    ) {
      setError(
        "Please select a CSV file."
      );
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      encoding: "UTF-8",

      transformHeader: (header) =>
        String(header).trim(),

      complete: (result) => {
        console.log(
          "CSV parsed:",
          result
        );

        if (
          result.errors &&
          result.errors.length > 0
        ) {
          console.warn(
            "CSV errors:",
            result.errors
          );

          setError(
            result.errors[0].message ||
              "There was a problem reading the CSV."
          );

          return;
        }

        if (
          !result.data ||
          result.data.length === 0
        ) {
          setError(
            "The CSV file is empty."
          );
          return;
        }

        const cleanedRows =
          result.data.filter((row) =>
            Object.values(row).some(
              (value) =>
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
            )
          );

        if (!cleanedRows.length) {
          setError(
            "No usable data was found in this CSV."
          );
          return;
        }

        setRows(cleanedRows);
        setFileName(file.name);
      },

      error: (error) => {
        console.error(error);

        setError(
          "Could not read this CSV file. Please make sure it is a valid CSV."
        );
      },
    });
  }

  // -----------------------------
  // DEMO DATA
  // -----------------------------

  function loadDemo() {
    const demo = [
      {
        Product: "Laptop",
        Category: "Technology",
        Quantity: 8,
        Revenue: 9600,
      },
      {
        Product: "Phone",
        Category: "Technology",
        Quantity: 20,
        Revenue: 14000,
      },
      {
        Product: "Headphones",
        Category: "Accessories",
        Quantity: 35,
        Revenue: 4200,
      },
      {
        Product: "Keyboard",
        Category: "Accessories",
        Quantity: 15,
        Revenue: 1800,
      },
      {
        Product: "Monitor",
        Category: "Technology",
        Quantity: 10,
        Revenue: 3500,
      },
      {
        Product: "Mouse",
        Category: "Accessories",
        Quantity: 30,
        Revenue: 2100,
      },
      {
        Product: "Tablet",
        Category: "Technology",
        Quantity: 12,
        Revenue: 7200,
      },
    ];

    setRows(demo);
    setFileName(
      "demo-sales-data.csv"
    );
    setError("");
  }

  // -----------------------------
  // UI
  // -----------------------------

  return (
    <div className="app">

      <header className="hero">

        <div className="badge">
          AI • DATA • INSIGHTS
        </div>

        <h1>
          AI Data
          <span> Analyst</span>
        </h1>

        <p>
          Upload your CSV and turn raw data
          into understandable statistics,
          visualizations and automatic insights.
        </p>

        <div className="upload-box">

          <div className="upload-icon">
            ↑
          </div>

          <h2>
            Analyze your dataset
          </h2>

          <p>
            Upload a CSV file to begin
          </p>

          <label className="upload-button">

            Choose CSV File

            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
            />

          </label>

          <button
            className="demo-button"
            onClick={loadDemo}
          >
            Try Demo Dataset
          </button>

          {fileName && (
            <div className="filename">
              ✓ {fileName}
            </div>
          )}

          {error && (
            <div className="error">
              {error}
            </div>
          )}

        </div>

      </header>


      {rows.length > 0 && (

        <main className="dashboard">

          {/* STATS */}

          <section className="stats">

            <div className="stat-card">
              <span>Rows</span>
              <strong>
                {rows.length.toLocaleString()}
              </strong>
            </div>

            <div className="stat-card">
              <span>
                {revenueColumn || "Main Metric"}
              </span>
              <strong>
                {totalRevenue.toLocaleString(
                  undefined,
                  {
                    maximumFractionDigits: 2,
                  }
                )}
              </strong>
            </div>

            <div className="stat-card">
              <span>Data Quality</span>
              <strong>
                {qualityScore}%
              </strong>
            </div>

            <div className="stat-card">
              <span>Columns</span>
              <strong>
                {columns.length}
              </strong>
            </div>

          </section>


          {/* CHART 1 */}

          <section className="panel">

            <div className="panel-heading">

              <div>
                <small>
                  VISUAL ANALYSIS
                </small>

                <h2>
                  {groupColumn
                    ? `${revenueColumn || "Value"} by ${groupColumn}`
                    : "Data Visualization"}
                </h2>
              </div>

            </div>

            {groupData.length > 0 ? (

              <ResponsiveContainer
                width="100%"
                height={380}
              >

                <BarChart
                  data={groupData}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 10,
                    bottom: 20,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={
                      groupData.length > 5
                        ? -25
                        : 0
                    }
                    textAnchor={
                      groupData.length > 5
                        ? "end"
                        : "middle"
                    }
                    height={
                      groupData.length > 5
                        ? 70
                        : 40
                    }
                  />

                  <YAxis />

                  <Tooltip />

                  <Bar
                    dataKey="value"
                    name={
                      revenueColumn ||
                      "Value"
                    }
                  />

                </BarChart>

              </ResponsiveContainer>

            ) : (

              <div className="empty">
                No category data could be
                detected for this chart.
              </div>

            )}

          </section>


          {/* AUTOMATIC EXPLANATION */}

          <section className="panel">

            <div className="panel-heading">

              <div>
                <small>
                  AI-STYLE AUTOMATED ANALYSIS
                </small>

                <h2>
                  What does your data say?
                </h2>
              </div>

            </div>

            <div className="insights">

              {insights.map(
                (insight, index) => (

                  <div
                    className="insight"
                    key={index}
                  >

                    <span>
                      {String(
                        index + 1
                      ).padStart(2, "0")}
                    </span>

                    <p>
                      {insight}
                    </p>

                  </div>

                )
              )}

            </div>

          </section>


          {/* SECOND CHART */}

          {numericChartData.length > 1 && (

            <section className="panel">

              <div className="panel-heading">

                <div>

                  <small>
                    NUMERIC TREND
                  </small>

                  <h2>
                    {revenueColumn}
                    {" "}by Record
                  </h2>

                </div>

              </div>

              <ResponsiveContainer
                width="100%"
                height={320}
              >

                <BarChart
                  data={numericChartData}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="name"
                  />

                  <YAxis />

                  <Tooltip />

                  <Bar
                    dataKey="value"
                    name={
                      revenueColumn
                    }
                  />

                </BarChart>

              </ResponsiveContainer>

            </section>

          )}


          {/* NUMERIC SUMMARY */}

          <section className="panel">

            <div className="panel-heading">

              <div>

                <small>
                  STATISTICAL SUMMARY
                </small>

                <h2>
                  Numeric Fields
                </h2>

              </div>

            </div>

            {numericStats.length > 0 ? (

              <div className="table-wrapper">

                <table>

                  <thead>

                    <tr>
                      <th>Field</th>
                      <th>Count</th>
                      <th>Average</th>
                      <th>Minimum</th>
                      <th>Maximum</th>
                      <th>Total</th>
                    </tr>

                  </thead>

                  <tbody>

                    {numericStats.map(
                      (stat) => (

                        <tr
                          key={
                            stat.column
                          }
                        >

                          <td>
                            {stat.column}
                          </td>

                          <td>
                            {stat.count}
                          </td>

                          <td>
                            {stat.average.toLocaleString(
                              undefined,
                              {
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>

                          <td>
                            {stat.minimum.toLocaleString(
                              undefined,
                              {
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>

                          <td>
                            {stat.maximum.toLocaleString(
                              undefined,
                              {
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>

                          <td>
                            {stat.sum.toLocaleString(
                              undefined,
                              {
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            ) : (

              <div className="empty">
                No numeric columns detected.
              </div>

            )}

          </section>


          {/* DATA STRUCTURE */}

          <section className="data-structure">

            <div className="structure-card">

              <span>
                NUMERIC FIELDS
              </span>

              <strong>
                {numericColumns.length}
              </strong>

              <p>
                {numericColumns.length
                  ? numericColumns.join(
                      ", "
                    )
                  : "None detected"}
              </p>

            </div>

            <div className="structure-card">

              <span>
                TEXT / CATEGORY FIELDS
              </span>

              <strong>
                {textColumns.length}
              </strong>

              <p>
                {textColumns.length
                  ? textColumns.join(
                      ", "
                    )
                  : "None detected"}
              </p>

            </div>

            <div className="structure-card">

              <span>
                MISSING CELLS
              </span>

              <strong>
                {missingCells}
              </strong>

              <p>
                {missingCells === 0
                  ? "Dataset appears complete"
                  : "Review missing values"}
              </p>

            </div>

          </section>


          {/* PROJECT INFO */}

          <section className="about-project">

            <div>

              <small>
                PROJECT
              </small>

              <h2>
                AI Data Analyst
              </h2>

            </div>

            <p>
              This application automatically
              analyzes uploaded CSV datasets,
              detects numeric and categorical
              fields, calculates statistics,
              creates visualizations and generates
              plain-English explanations from the
              available data.
            </p>

          </section>

        </main>

      )}


      <footer>
        <p>
          AI Data Analyst • React + Vite
        </p>
      </footer>

    </div>
  );
}

createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);