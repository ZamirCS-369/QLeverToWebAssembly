export function renderQleverResult(jsonString) {
  const data = JSON.parse(jsonString);

  const container = document.getElementById("resultContainer");
  container.innerHTML = "";

  if (!data.res || data.res.length === 0) {
    container.innerHTML = "<p>No results.</p>";
    return;
  }

  const table = document.createElement("table");
  table.className = "qlever-table";

  // Header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  data.selected.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");

  data.res.forEach(row => {
    const tr = document.createElement("tr");

    row.forEach(cell => {
      const td = document.createElement("td");

      if (cell.startsWith("<") && cell.endsWith(">")) {
        const iri = cell.slice(1, -1);
        const a = document.createElement("a");
        a.href = iri;
        a.textContent = iri;
        a.target = "_blank";
        td.appendChild(a);
      } else {
        td.textContent = cell;
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);

  const info = document.createElement("p");
  info.textContent = `Returned ${data.resultSizeTotal} results in ${data.time.total}`;
  container.appendChild(info);
}
