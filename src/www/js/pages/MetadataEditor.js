export class MetadataEditor {

    constructor() {
        this.addTable()
    }

    addTable() {
        let table = document.createElement("table");

        table.id = "my-table";
        table.className = "custom-table";

        let numRows = 2
        let numCols = 2

        for (let i = 0; i < numRows; i++) {
            let row = document.createElement("tr"); // create row

            for (let j = 0; j < numCols; j++) {
                let cell = document.createElement("td"); // create cell

                let textNode = document.createTextNode(`Row ${i+1}, Cell ${j+1}`);
                cell.appendChild(textNode);

                row.appendChild(cell);
            }

            table.appendChild(row);
        }

        document.appendChild(table);
    }

}
