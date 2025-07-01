import sharp from "sharp";
import { extractCandidateKeywords, markEffectiveCandidates } from "./ocr";

describe("OCR test", () => {
  it("should extract candidates", async () => {
    const ret = await extractCandidateKeywords("../tmp-data/img1.jpeg", ocrResult.output.results);
    console.log(
      "cnadidates",
      ret.map((r) => r.text)
    );
  });

  it("should mark candidates", async () => {
    const ret = await extractCandidateKeywords("../tmp-data/img1.jpeg", ocrResult.output.results);
    const effective = ret.filter((r) => r.text != "月29日" && r.text != "K");
    const marked = await markEffectiveCandidates("../tmp-data/img1.jpeg", effective);
    console.log(marked);
  });

  it.only("should mark correct positions", async () => {
    const imgFile = "../tmp-data/img1.jpeg";
    const ocrResults = ocrResult.output.results;

    const img = sharp(imgFile).removeAlpha().greyscale().toColourspace("b-w");
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    let posMarks = ocrResults.filter((r) => r.text.includes("是否进货")).map((r) => r.box);
    if (posMarks.length < 3) {
      posMarks = ocrResults
        .filter((r) => (r.text.includes("是") || r.text.includes("否")) && r.text.includes("进货"))
        .map((r) => r.box);
    }
    if (posMarks.length != 3) {
      return [];
    }

    const [box0, box1, box2] = posMarks;
    const pos0 = { x: Math.round(box0[0][0] - (box0[1][0] - box0[0][0]) / 3), y: box0[0][1] };
    const pos1 = { x: Math.round(box1[0][0] - (box1[1][0] - box1[0][0]) / 5), y: box1[0][1] };
    const pos2 = { x: Math.round(box2[0][0] - (box2[1][0] - box2[0][0]) / 9), y: box2[0][1] };
    const w = Math.round(((box0[1][0] - box0[0][0] + (box1[1][0] - box1[0][0]) + (box2[1][0] - box2[0][0])) * 1.5) / 3);
    const h = Math.round((box0[2][1] - box0[0][1] + (box1[2][1] - box1[0][1]) + (box2[2][1] - box2[0][1])) / 3);

    if (pos1.x <= pos0.x || pos2.y <= pos1.y) {
      return [];
    }

    ocrResults
      // .filter((r) => r.text.includes("打包盒"))
      .forEach((r) => {
        let markPos = pos0;
        if (r.box[0][0] > pos0.x + w / 2) {
          markPos = r.box[0][1] > pos2.y + h / 2 ? pos2 : pos1;
        }
        const yc = (r.box[0][1] + r.box[2][1]) / 2;
        const y0 = Math.max(0, Math.min(info.height - 1, Math.round(yc - h / 2)));
        const y1 = Math.max(0, Math.min(info.height - 1, Math.round(yc + h / 2)));
        const xCorrection = Math.round(((y0 - markPos.y) * (pos2.x - pos1.x)) / (pos2.y - pos1.y));
        const x0 = Math.max(0, Math.min(info.width - 1, markPos.x + xCorrection));
        const x1 = Math.max(0, Math.min(info.width - 1, x0 + w));
        for (let x = x0; x <= x1; x++) {
          for (let y = y0; y <= y1; y++) {
            if (data[y * info.width + x] < 128) data[y * info.width + x] = 0;
            else data[y * info.width + x] = 255;
            // data[y * info.width + x] = 255;
          }
        }
      });

    await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels,
      },
    }).toFile("../tmp-data/img1-marked.jpeg");
  });
});

const ocrResult = {
  completed_at: "2025-06-30T01:27:16.287615Z",
  created_at: "2025-06-30T01:25:43.997000Z",
  data_removed: false,
  error: null,
  id: "zcx14gd9qnrgc0cqqsracgtsy4",
  input: {
    lang: "ch",
    image: "https://replicate.delivery/pbxt/NH1TGbhCbi5eHZUksJAfC2yCZPuGiBBR1EUQzuXCXWAlefab/WechatIMG77853.jpeg",
  },
  logs: "[2025/06/30 01:27:15] ppocr DEBUG: dt_boxes num : 56, elapsed : 0.499286413192749\n[2025/06/30 01:27:15] ppocr DEBUG: cls num  : 56, elapsed : 0.10578536987304688\n[2025/06/30 01:27:16] ppocr DEBUG: rec_res num  : 56, elapsed : 0.2913196086883545",
  metrics: {
    predict_time: 1.073443333,
    total_time: 92.290615,
  },
  output: {
    results: [
      {
        box: [
          [85, 308],
          [165, 308],
          [165, 337],
          [85, 337],
        ],
        text: "日期：",
        confidence: 0.9936677813529968,
      },
      {
        box: [
          [202, 308],
          [286, 305],
          [288, 340],
          [203, 343],
        ],
        text: "月29日",
        confidence: 0.9975813031196594,
      },
      {
        box: [
          [108, 344],
          [183, 347],
          [182, 378],
          [107, 374],
        ],
        text: "冻品类",
        confidence: 0.9955954551696777,
      },
      {
        box: [
          [230, 345],
          [328, 345],
          [328, 375],
          [230, 375],
        ],
        text: "是否进货",
        confidence: 0.9955782890319824,
      },
      {
        box: [
          [451, 344],
          [525, 344],
          [525, 373],
          [451, 373],
        ],
        text: "生鲜类",
        confidence: 0.9963958263397217,
      },
      {
        box: [
          [600, 342],
          [699, 337],
          [701, 366],
          [602, 371],
        ],
        text: "是石进货",
        confidence: 0.7802519798278809,
      },
      {
        box: [
          [83, 384],
          [138, 384],
          [138, 416],
          [83, 416],
        ],
        text: "肉丝",
        confidence: 0.9996180534362793,
      },
      {
        box: [
          [463, 379],
          [515, 379],
          [515, 411],
          [463, 411],
        ],
        text: "皮蛋",
        confidence: 0.9970024824142456,
      },
      {
        box: [
          [208, 394],
          [250, 388],
          [253, 416],
          [212, 421],
        ],
        text: "K",
        confidence: 0.5518708229064941,
      },
      {
        box: [
          [85, 421],
          [136, 421],
          [136, 453],
          [85, 453],
        ],
        text: "蒸饺",
        confidence: 0.9995010495185852,
      },
      {
        box: [
          [465, 416],
          [515, 416],
          [515, 448],
          [465, 448],
        ],
        text: "大米",
        confidence: 0.9672656059265137,
      },
      {
        box: [
          [86, 461],
          [160, 461],
          [160, 491],
          [86, 491],
        ],
        text: "小笼包",
        confidence: 0.9980631470680237,
      },
      {
        box: [
          [462, 452],
          [516, 452],
          [516, 488],
          [462, 488],
        ],
        text: "糯米",
        confidence: 0.968022346496582,
      },
      {
        box: [
          [86, 498],
          [162, 494],
          [163, 525],
          [87, 528],
        ],
        text: "小米糕",
        confidence: 0.9900152087211609,
      },
      {
        box: [
          [465, 491],
          [516, 491],
          [516, 525],
          [465, 525],
        ],
        text: "鸡蛋",
        confidence: 0.9961243867874146,
      },
      {
        box: [
          [89, 535],
          [140, 535],
          [140, 565],
          [89, 565],
        ],
        text: "肉包",
        confidence: 0.9996566772460938,
      },
      {
        box: [
          [465, 528],
          [516, 528],
          [516, 560],
          [465, 560],
        ],
        text: "青菜",
        confidence: 0.7893675565719604,
      },
      {
        box: [
          [86, 571],
          [142, 571],
          [142, 601],
          [86, 601],
        ],
        text: "馒头",
        confidence: 0.9936584234237671,
      },
      {
        box: [
          [466, 564],
          [518, 564],
          [518, 599],
          [466, 599],
        ],
        text: "南瓜",
        confidence: 0.9990341663360596,
      },
      {
        box: [
          [402, 597],
          [484, 597],
          [484, 643],
          [402, 643],
        ],
        text: "姜蒜",
        confidence: 0.887545645236969,
      },
      {
        box: [
          [91, 607],
          [165, 607],
          [165, 640],
          [91, 640],
        ],
        text: "牛肉饼",
        confidence: 0.999846875667572,
      },
      {
        box: [
          [91, 644],
          [146, 644],
          [146, 675],
          [91, 675],
        ],
        text: "油条",
        confidence: 0.9970332384109497,
      },
      {
        box: [
          [406, 640],
          [442, 640],
          [442, 680],
          [406, 680],
        ],
        text: "肉",
        confidence: 0.9629925489425659,
      },
      {
        box: [
          [92, 682],
          [164, 678],
          [166, 709],
          [94, 712],
        ],
        text: "南瓜饼",
        confidence: 0.9991951584815979,
      },
      {
        box: [
          [395, 678],
          [499, 665],
          [505, 713],
          [401, 726],
        ],
        text: "青黄爪",
        confidence: 0.9012201428413391,
      },
      {
        box: [
          [93, 716],
          [146, 716],
          [146, 747],
          [93, 747],
        ],
        text: "咸骨",
        confidence: 0.7073984146118164,
      },
      {
        box: [
          [407, 714],
          [468, 710],
          [471, 753],
          [410, 757],
        ],
        text: "西芹",
        confidence: 0.9690815210342407,
      },
      {
        box: [
          [586, 724],
          [634, 711],
          [641, 742],
          [593, 754],
        ],
        text: "K",
        confidence: 0.7342040538787842,
      },
      {
        box: [
          [95, 753],
          [181, 753],
          [181, 792],
          [95, 792],
        ],
        text: "海白菜",
        confidence: 0.9743432998657227,
      },
      {
        box: [
          [452, 748],
          [531, 751],
          [530, 784],
          [451, 781],
        ],
        text: "包材类",
        confidence: 0.9978393912315369,
      },
      {
        box: [
          [597, 753],
          [696, 753],
          [696, 781],
          [597, 781],
        ],
        text: "是否进货",
        confidence: 0.9954119920730591,
      },
      {
        box: [
          [455, 785],
          [570, 791],
          [568, 825],
          [453, 818],
        ],
        text: "打包袋小",
        confidence: 0.997905433177948,
      },
      {
        box: [
          [92, 795],
          [156, 791],
          [158, 827],
          [94, 831],
        ],
        text: "红豆",
        confidence: 0.6816473007202148,
      },
      {
        box: [
          [93, 829],
          [163, 823],
          [167, 863],
          [96, 869],
        ],
        text: "绿豆",
        confidence: 0.9631735682487488,
      },
      {
        box: [
          [457, 827],
          [529, 827],
          [529, 856],
          [457, 856],
        ],
        text: "餐具包",
        confidence: 0.9925375580787659,
      },
      {
        box: [
          [88, 866],
          [183, 862],
          [184, 897],
          [90, 900],
        ],
        text: "榨菜丝",
        confidence: 0.7836601138114929,
      },
      {
        box: [
          [469, 861],
          [520, 861],
          [520, 893],
          [469, 893],
        ],
        text: "粥桶",
        confidence: 0.9834455847740173,
      },
      {
        box: [
          [84, 896],
          [210, 900],
          [208, 939],
          [83, 934],
        ],
        text: "莲藕炖脊骨",
        confidence: 0.7153898477554321,
      },
      {
        box: [
          [424, 897],
          [553, 897],
          [553, 925],
          [424, 925],
        ],
        text: "打包盒（小）",
        confidence: 0.9897133708000183,
      },
      {
        box: [
          [85, 933],
          [173, 933],
          [173, 977],
          [85, 977],
        ],
        text: "感鸭蛋",
        confidence: 0.7488207221031189,
      },
      {
        box: [
          [91, 975],
          [208, 975],
          [208, 1012],
          [91, 1012],
        ],
        text: "鲜肉肠粉",
        confidence: 0.9988362193107605,
      },
      {
        box: [
          [87, 1009],
          [213, 1009],
          [213, 1053],
          [87, 1053],
        ],
        text: "香葱小油条",
        confidence: 0.8713350296020508,
      },
      {
        box: [
          [87, 1048],
          [170, 1045],
          [171, 1084],
          [89, 1087],
        ],
        text: "大英米",
        confidence: 0.8196081519126892,
      },
      {
        box: [
          [98, 1087],
          [187, 1087],
          [187, 1121],
          [98, 1121],
        ],
        text: "星米",
        confidence: 0.9785655736923218,
      },
      {
        box: [
          [91, 1124],
          [196, 1124],
          [196, 1179],
          [91, 1179],
        ],
        text: "葱油饼",
        confidence: 0.9804694056510925,
      },
    ],
  },
  started_at: "2025-06-30T01:27:15.214172Z",
  status: "succeeded",
  urls: {
    get: "https://api.replicate.com/v1/predictions/zcx14gd9qnrgc0cqqsracgtsy4",
    cancel: "https://api.replicate.com/v1/predictions/zcx14gd9qnrgc0cqqsracgtsy4/cancel",
    web: "https://replicate.com/p/zcx14gd9qnrgc0cqqsracgtsy4",
  },
  version: "084b779cb09bc2462335a5768fabaeaaba53bb3f70afd0d2fe48fad71fdc4d5a",
};
