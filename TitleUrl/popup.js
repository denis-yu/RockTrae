const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageInput = document.getElementById('imageInput');
let originalImage = null;

imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            originalImage = new Image();
            originalImage.onload = function() {
                canvas.width = originalImage.width;
                canvas.height = originalImage.height;
                ctx.drawImage(originalImage, 0, 0);
                if (document.getElementById('subtitleText').value.trim()) {
                    generateSubtitle();
                }
            };
            originalImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

function generateSubtitle() {
    if (!originalImage) {
        alert('请先选择图片！');
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImage, 0, 0);

    const text = document.getElementById('subtitleText').value.trim();
    if (!text) {
        alert('请输入字幕文本！');
        return;
    }

    const subtitleHeight = parseInt(document.getElementById('subtitleHeight').value);
    const fontSize = parseInt(document.getElementById('fontSize').value);
    const fontColor = document.getElementById('fontColor').value;
    const strokeColor = document.getElementById('strokeColor').value;
    const lines = text.split('\n');

    ctx.textAlign = 'center';
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = fontColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;

    const totalHeight = lines.length * subtitleHeight;
    let startY = canvas.height - totalHeight;

    lines.forEach((line, index) => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, startY + (index * subtitleHeight), canvas.width, subtitleHeight);

        ctx.fillStyle = fontColor;
        const textY = startY + (index * subtitleHeight) + (subtitleHeight + fontSize) / 2;
        ctx.strokeText(line, canvas.width / 2, textY);
        ctx.fillText(line, canvas.width / 2, textY);
    });
}

function saveImage() {
    const link = document.createElement('a');
    link.download = 'subtitle_image.png';
    link.href = canvas.toDataURL();
    link.click();
}