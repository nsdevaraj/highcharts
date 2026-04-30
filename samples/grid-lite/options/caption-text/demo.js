const captionInput = document.getElementById('caption-text');

const grid = Grid.grid('container', {
    data: {
        columns: {
            product: ['Apples', 'Pears', 'Plums', 'Bananas'],
            stock: [120, 85, 40, 200],
            price: [1.5, 2.53, 5, 4.5]
        }
    },
    caption: {
        text: captionInput.value
    }
});

captionInput.addEventListener('input', () => {
    grid.update({
        caption: {
            text: captionInput.value
        }
    });
});
