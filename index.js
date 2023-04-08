const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ASSET_DIR = path.join(__dirname, 'assets');
const AI_DIR = path.join(ASSET_DIR, 'ai');
const HUMAN_DIR = path.join(ASSET_DIR, 'human');
const FONT_DIR = path.join(ASSET_DIR, 'arial.ttf');
const BACKGROUND = path.join(ASSET_DIR, 'background.png');

const WIDTH = 1920;
const HEIGHT = 1080;

const IMAGE_SIZE = 874;

registerFont(FONT_DIR, { family: 'Arial' })

const cropImage = (image) => {
	const canvas = createCanvas(874, 874);
	const ctx = canvas.getContext('2d');

	let x = 0;
	let w = image.width;
	let h = w;
	let y = image.height - h;

	const aspectRatio = image.width / image.height;

	if (aspectRatio > 1) {
		// Image is wider than tall, crop the sides
		w = image.height * 0.874;
		h = image.height;
		x = (image.width - w) / 2;
		y = 0;
	}

	ctx.drawImage(image, x, y, w, h, 0, 0, 874, 874);

	return canvas;
};

function getRandomNumber() {
	return crypto.randomBytes(4).readUInt32BE(0) / 4294967295;
}

const getPairedImages = (setLevel) => {
	const aiFiles = fs.readdirSync(AI_DIR);
	const pairedImages = [];
	aiFiles.forEach((aiFilename) => {
		const aiFilepath = path.join(AI_DIR, aiFilename);
		const humanFilepath = path.join(HUMAN_DIR, aiFilename);
		const level = aiFilename?.split('-')?.[0]?.slice(1) || 'N/A';

		if (setLevel[0] !== undefined && !setLevel?.includes(level)) return;

		pairedImages.push({ aiFilepath, humanFilepath, level });
	});
	return pairedImages;
};

const drawImagePair = async (setLevel) => {
	let AI_POS = { x: 1091, y: 175 };
	let HUMAN_POS = { x: 18, y: 171 };
	let IS_AI = 1;

	const canvas = createCanvas(WIDTH, HEIGHT);
	const ctx = canvas.getContext('2d');

	const pairedImages = getPairedImages(setLevel);
	const randomIndex = Math.floor(Math.random() * pairedImages.length);

	const { aiFilepath, humanFilepath, level } = pairedImages[randomIndex];

	const backgroundImage = await loadImage(BACKGROUND);
	const aiImage = await loadImage(aiFilepath);
	const humanImage = await loadImage(humanFilepath);

	const croppedAiImage = cropImage(aiImage);
	const croppedHumanImage = cropImage(humanImage);

	const whichSide = getRandomNumber();

	if (whichSide > 0.5) {
		IS_AI = 0;

		[AI_POS, HUMAN_POS] = [HUMAN_POS, AI_POS];
	}

	ctx.drawImage(croppedAiImage, AI_POS.x, AI_POS.y, IMAGE_SIZE, IMAGE_SIZE);
	ctx.drawImage(croppedHumanImage, HUMAN_POS.x, HUMAN_POS.y, IMAGE_SIZE, IMAGE_SIZE);
	ctx.drawImage(backgroundImage, 0, 0);

	ctx.font = '45px "Arial"';
	ctx.fillStyle = '#ffffff';
	ctx.fillText(`LEVEL ${level}`, 1650, 100);

	const buffer = canvas.toBuffer('image/jpeg');

	return { level, buffer, IS_AI, prompt: aiFilepath.split('-').slice(1).join(' ').replace(/.png/g, '') };
};

module.exports = drawImagePair;