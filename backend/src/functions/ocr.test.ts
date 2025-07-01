import { handler } from "./ocr";

describe("OCR API test", () => {
  it("should create ocr task", async () => {
    const ret = await handler({
        httpMethod: "POST",
        path: "/ocr",
        queryStringParameters: { shop_id: "1" },
        body: JSON.stringify({
            image_url: "https://smart-inventory-publics3bucket-lovmeek8dbym.s3.ap-southeast-1.amazonaws.com/ocr/951d1435-380d-429f-9d50-08392f51cbba.jpeg",
        }),
    } as any);
    console.log(ret);
  });

  it.only("should get ocr task", async () => {
    const ret = await handler({
        httpMethod: "GET",
        path: "/ocr",
        queryStringParameters: { shop_id: "1" },
    } as any);
    console.log(ret);
  });

  it("should consume ocr task", async () => {
    const ret = await handler({
        httpMethod: "POST",
        path: "/ocr/consume",
        queryStringParameters: { shop_id: "1" },
    } as any);
    console.log(ret);
  });
});
