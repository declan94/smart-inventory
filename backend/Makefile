build:
	npm ci
	npm run build
	pushd ./dist/ocr
	mkdir node_modules
	npm install --include=optional sharp
	npm install --os=linux --cpu=x64 sharp

deploy: build
	sam deploy