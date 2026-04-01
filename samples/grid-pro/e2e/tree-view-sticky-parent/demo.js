const ids = [];
const parentIds = [];
const names = [];
const budgets = [];

let nextId = 1;

function addRow(parentId, name, budget) {
    const id = nextId++;

    ids.push(id);
    parentIds.push(parentId);
    names.push(name);
    budgets.push(budget);

    return id;
}

for (let level1 = 1; level1 <= 3; ++level1) {
    const regionId = addRow(
        null,
        `Region ${level1}`,
        10000 + level1 * 1000
    );

    for (let level2 = 1; level2 <= 5; ++level2) {
        const divisionId = addRow(
            regionId,
            `Division ${level1}.${level2}`,
            2000 + level1 * 200 + level2 * 50
        );

        for (let level3 = 1; level3 <= 20; ++level3) {
            addRow(
                divisionId,
                `Team ${level1}.${level2}.${level3}`,
                100 + level2 * 10 + level3
            );
        }
    }
}

window.grid = Grid.grid('container', {
    data: {
        columns: {
            id: ids,
            parentId: parentIds,
            name: names,
            budget: budgets
        },
        idColumn: 'id',
        treeView: {
            initiallyExpanded: true,
            treeColumn: 'name'
        }
    },
    header: ['name', 'budget'],
    rendering: {
        rows: {
            virtualization: true
        }
    }
});
