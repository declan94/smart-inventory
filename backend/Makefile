build:
	npm ci
	npm run build
	cd dist/ocr && npm install --os=linux --cpu=x64 sharp

deploy: build
	sam deploy