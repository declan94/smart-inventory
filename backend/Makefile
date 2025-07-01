build:
	npm ci
	npm run build
	cd dist/ocr
	mkdir -p node_modules
	npm install --include=optional sharp
	npm install --os=linux --cpu=x64 sharp

deploy: build
	sam deploy