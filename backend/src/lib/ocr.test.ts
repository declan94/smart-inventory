import sharp from "sharp";
import { extractCandidateKeywords, markEffectiveCandidates } from "./ocr";

describe("OCR test", () => {
  it.only("should extract candidates", async () => {
    const ret = await extractCandidateKeywords("../tmp-data/img3.jpeg", ocrResult3.output.results);
    console.log(
      "cnadidates",
      ret.map((r) => r.text)
    );
  });

  it("should mark candidates", async () => {
    const ret = await extractCandidateKeywords("../tmp-data/img1.jpeg", ocrResult1.output.results);
    const effective = ret.filter((r) => r.text != "月29日" && r.text != "K");
    const marked = await markEffectiveCandidates("../tmp-data/img1.jpeg", effective);
    console.log(marked);
  });

  it.only("should mark correct positions", async () => {
    const imgFile = "../tmp-data/img3.jpeg";
    const ocrResults = ocrResult3.output.results;

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
    let pos0 = { x: Math.round(box0[0][0] - (box0[1][0] - box0[0][0]) / 3), y: box0[0][1] };
    let pos1 = { x: Math.round(box1[0][0] - (box1[1][0] - box1[0][0]) / 5), y: box1[0][1] };
    let pos2 = { x: Math.round(box2[0][0] - (box2[1][0] - box2[0][0]) / 9), y: box2[0][1] };
    const w = Math.round(((box0[1][0] - box0[0][0] + (box1[1][0] - box1[0][0]) + (box2[1][0] - box2[0][0])) * 1.5) / 3);
    const h = Math.round((box0[2][1] - box0[0][1] + (box1[2][1] - box1[0][1]) + (box2[2][1] - box2[0][1])) / 3);

    // adjust order, make sure that:
    // pos0: top left
    // pos1: top right
    // pos2: bottom right
    if (pos0.y > pos2.y) {
      [pos0, pos2] = [pos2, pos0];
    }
    if (pos1.y > pos2.y) {
      [pos1, pos2] = [pos2, pos1];
    }
    if (pos0.x > pos1.x) {
      [pos0, pos1] = [pos1, pos0];
    }

    // left pos marks used to calibrate positions on the left column
    let leftPosMarks = ocrResults.filter((r) => ["咸骨", "肉丝"].includes(r.text)).map((r) => r.box);
    let lpos0: { x: number; y: number } | null = null;
    let lpos1: { x: number; y: number } | null = null;
    if (leftPosMarks.length == 2) {
      const [lbox0, lbox1] = leftPosMarks;
      lpos0 = { x: lbox0[0][0], y: lbox0[0][1] };
      lpos1 = { x: lbox1[0][0], y: lbox1[0][1] };
      if (lpos0.y > lpos1.y) {
        [lpos0, lpos1] = [lpos1, lpos0];
      }
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
        const xCorrection =
          markPos == pos0 && lpos0 && lpos1
            ? Math.round(((y0 - markPos.y) * (lpos1.x - lpos0.x)) / (lpos1.y - lpos0.y))
            : Math.round(((y0 - markPos.y) * (pos2.x - pos1.x)) / (pos2.y - pos1.y));
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
    }).toFile("../tmp-data/img3-marked.jpeg");
  });
});

const ocrResult1 = {
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

const ocrResult2 = {
  completed_at: "2025-07-01T06:54:23.051844Z",
  created_at: "2025-07-01T06:53:16.661000Z",
  data_removed: false,
  error: null,
  id: "fe58rp75ynrg80cqrk1ab7f1am",
  input: {
    lang: "ch",
    image:
      "https://smart-inventory-publics3bucket-lovmeek8dbym.s3.amazonaws.com/ocr/e4e280b0-3ad9-43f6-9dfc-ce969e07e78d.jpeg",
  },
  logs: "[2025/07/01 06:54:22] ppocr DEBUG: dt_boxes num : 40, elapsed : 0.4074828624725342\n[2025/07/01 06:54:22] ppocr DEBUG: cls num  : 40, elapsed : 0.08028197288513184\n[2025/07/01 06:54:23] ppocr DEBUG: rec_res num  : 40, elapsed : 0.2237379550933838",
  metrics: {
    predict_time: 2.645257648,
    total_time: 66.390844,
  },
  output: {
    results: [
      {
        box: [
          [139, 560],
          [282, 560],
          [282, 604],
          [139, 604],
        ],
        text: "日期：7",
        confidence: 0.9714065790176392,
      },
      {
        box: [
          [320, 564],
          [345, 564],
          [345, 596],
          [320, 596],
        ],
        text: "月",
        confidence: 0.998298704624176,
      },
      {
        box: [
          [342, 561],
          [430, 553],
          [434, 597],
          [346, 605],
        ],
        text: "一日",
        confidence: 0.6984590888023376,
      },
      {
        box: [
          [895, 565],
          [1035, 559],
          [1037, 607],
          [897, 613],
        ],
        text: "是否进货",
        confidence: 0.9967827200889587,
      },
      {
        box: [
          [666, 589],
          [777, 579],
          [781, 623],
          [670, 633],
        ],
        text: "生鲜类",
        confidence: 0.9971823692321777,
      },
      {
        box: [
          [173, 610],
          [282, 610],
          [282, 654],
          [173, 654],
        ],
        text: "冻品类",
        confidence: 0.9983164668083191,
      },
      {
        box: [
          [349, 609],
          [490, 599],
          [493, 641],
          [351, 651],
        ],
        text: "是否进货",
        confidence: 0.996914267539978,
      },
      {
        box: [
          [682, 641],
          [764, 635],
          [767, 681],
          [685, 687],
        ],
        text: "皮蛋",
        confidence: 0.998665452003479,
      },
      {
        box: [
          [139, 666],
          [212, 666],
          [212, 706],
          [139, 706],
        ],
        text: "肉丝",
        confidence: 0.9991669654846191,
      },
      {
        box: [
          [688, 695],
          [766, 689],
          [769, 737],
          [691, 743],
        ],
        text: "大米",
        confidence: 0.9931880235671997,
      },
      {
        box: [
          [137, 718],
          [212, 718],
          [212, 764],
          [137, 764],
        ],
        text: "蒸饺",
        confidence: 0.999681293964386,
      },
      {
        box: [
          [686, 750],
          [768, 745],
          [771, 794],
          [689, 799],
        ],
        text: "糯米",
        confidence: 0.9967283010482788,
      },
      {
        box: [
          [134, 773],
          [245, 767],
          [247, 811],
          [136, 817],
        ],
        text: "小笼包",
        confidence: 0.9987074732780457,
      },
      {
        box: [
          [693, 804],
          [770, 804],
          [770, 852],
          [693, 852],
        ],
        text: "鸡蛋",
        confidence: 0.9997431039810181,
      },
      {
        box: [
          [137, 824],
          [248, 824],
          [248, 868],
          [137, 868],
        ],
        text: "小米糕",
        confidence: 0.996042013168335,
      },
      {
        box: [
          [692, 861],
          [770, 855],
          [773, 903],
          [695, 909],
        ],
        text: "青菜",
        confidence: 0.8928389549255371,
      },
      {
        box: [
          [137, 880],
          [212, 880],
          [212, 926],
          [137, 926],
        ],
        text: "肉包",
        confidence: 0.999014139175415,
      },
      {
        box: [
          [697, 914],
          [774, 914],
          [774, 960],
          [697, 960],
        ],
        text: "南瓜",
        confidence: 0.9999061822891235,
      },
      {
        box: [
          [135, 932],
          [212, 932],
          [212, 978],
          [135, 978],
        ],
        text: "馒头",
        confidence: 0.9969308972358704,
      },
      {
        box: [
          [137, 986],
          [248, 986],
          [248, 1030],
          [137, 1030],
        ],
        text: "牛肉饼",
        confidence: 0.9995582699775696,
      },
      {
        box: [
          [133, 1042],
          [214, 1042],
          [214, 1088],
          [133, 1088],
        ],
        text: "油条",
        confidence: 0.9946762323379517,
      },
      {
        box: [
          [640, 1037],
          [734, 1031],
          [737, 1087],
          [644, 1093],
        ],
        text: "苦瓜",
        confidence: 0.7370131015777588,
      },
      {
        box: [
          [647, 1088],
          [697, 1088],
          [697, 1146],
          [647, 1146],
        ],
        text: "肉",
        confidence: 0.9984562397003174,
      },
      {
        box: [
          [134, 1101],
          [247, 1095],
          [249, 1139],
          [136, 1145],
        ],
        text: "南瓜饼",
        confidence: 0.9997983574867249,
      },
      {
        box: [
          [645, 1138],
          [758, 1138],
          [758, 1206],
          [645, 1206],
        ],
        text: "青叔",
        confidence: 0.8510589599609375,
      },
      {
        box: [
          [135, 1154],
          [216, 1154],
          [216, 1200],
          [135, 1200],
        ],
        text: "咸骨",
        confidence: 0.8524107336997986,
      },
      {
        box: [
          [687, 1196],
          [804, 1196],
          [804, 1246],
          [687, 1246],
        ],
        text: "包材类",
        confidence: 0.9822983145713806,
      },
      {
        box: [
          [903, 1200],
          [1057, 1196],
          [1059, 1240],
          [904, 1244],
        ],
        text: "是否进货",
        confidence: 0.9904049634933472,
      },
      {
        box: [
          [123, 1213],
          [285, 1207],
          [286, 1263],
          [124, 1269],
        ],
        text: "芝麻香油",
        confidence: 0.9733027219772339,
      },
      {
        box: [
          [687, 1254],
          [806, 1254],
          [806, 1304],
          [687, 1304],
        ],
        text: "打包袋",
        confidence: 0.999579668045044,
      },
      {
        box: [
          [116, 1269],
          [312, 1261],
          [314, 1325],
          [119, 1333],
        ],
        text: "莲藕炖脊骨",
        confidence: 0.8310073614120483,
      },
      {
        box: [
          [691, 1316],
          [804, 1316],
          [804, 1360],
          [691, 1360],
        ],
        text: "餐具包",
        confidence: 0.992122232913971,
      },
      {
        box: [
          [118, 1331],
          [304, 1323],
          [306, 1379],
          [121, 1387],
        ],
        text: "红糖馒头",
        confidence: 0.9556106328964233,
      },
      {
        box: [
          [709, 1374],
          [790, 1374],
          [790, 1420],
          [709, 1420],
        ],
        text: "粥桶",
        confidence: 0.9972480535507202,
      },
      {
        box: [
          [118, 1385],
          [297, 1375],
          [301, 1439],
          [122, 1449],
        ],
        text: "葱油花卷",
        confidence: 0.9065938591957092,
      },
      {
        box: [
          [640, 1430],
          [846, 1434],
          [845, 1478],
          [639, 1474],
        ],
        text: "打包盒（小）",
        confidence: 0.9909868836402893,
      },
      {
        box: [
          [117, 1452],
          [308, 1434],
          [314, 1498],
          [123, 1516],
        ],
        text: "甘梅地瓜条",
        confidence: 0.9708986282348633,
      },
    ],
  },
  started_at: "2025-07-01T06:54:20.406586Z",
  status: "succeeded",
  urls: {
    get: "https://api.replicate.com/v1/predictions/fe58rp75ynrg80cqrk1ab7f1am",
    cancel: "https://api.replicate.com/v1/predictions/fe58rp75ynrg80cqrk1ab7f1am/cancel",
    web: "https://replicate.com/p/fe58rp75ynrg80cqrk1ab7f1am",
  },
  version: "084b779cb09bc2462335a5768fabaeaaba53bb3f70afd0d2fe48fad71fdc4d5a",
};

const ocrResult3 = {
  "completed_at": "2025-07-02T07:24:17.767579Z",
  "created_at": "2025-07-02T07:24:12.835000Z",
  "data_removed": false,
  "error": null,
  "id": "b5g86zmmmdrge0cqs82vyyyew8",
  "input": {
    "lang": "ch",
    "image": "https://smart-inventory-publics3bucket-lovmeek8dbym.s3.amazonaws.com/ocr/de3fabd3-92d1-4673-86f2-20f751c7cf92.jpeg"
  },
  "logs": "[2025/07/02 07:24:14] ppocr DEBUG: Namespace(help='==SUPPRESS==', use_gpu=True, use_xpu=False, use_npu=False, use_mlu=False, ir_optim=True, use_tensorrt=False, min_subgraph_size=15, precision='fp32', gpu_mem=500, gpu_id=0, image_dir=None, page_num=0, det_algorithm='DB', det_model_dir='/root/.paddleocr/whl/det/ch/ch_PP-OCRv4_det_infer', det_limit_side_len=960, det_limit_type='max', det_box_type='quad', det_db_thresh=0.3, det_db_box_thresh=0.6, det_db_unclip_ratio=1.5, max_batch_size=10, use_dilation=False, det_db_score_mode='fast', det_east_score_thresh=0.8, det_east_cover_thresh=0.1, det_east_nms_thresh=0.2, det_sast_score_thresh=0.5, det_sast_nms_thresh=0.2, det_pse_thresh=0, det_pse_box_thresh=0.85, det_pse_min_area=16, det_pse_scale=1, scales=[8, 16, 32], alpha=1.0, beta=1.0, fourier_degree=5, rec_algorithm='SVTR_LCNet', rec_model_dir='/root/.paddleocr/whl/rec/ch/ch_PP-OCRv4_rec_infer', rec_image_inverse=True, rec_image_shape='3, 48, 320', rec_batch_num=6, max_text_length=25, rec_char_dict_path='/root/.pyenv/versions/3.9.19/lib/python3.9/site-packages/paddleocr/ppocr/utils/ppocr_keys_v1.txt', use_space_char=True, vis_font_path='./doc/fonts/simfang.ttf', drop_score=0.5, e2e_algorithm='PGNet', e2e_model_dir=None, e2e_limit_side_len=768, e2e_limit_type='max', e2e_pgnet_score_thresh=0.5, e2e_char_dict_path='./ppocr/utils/ic15_dict.txt', e2e_pgnet_valid_set='totaltext', e2e_pgnet_mode='fast', use_angle_cls=True, cls_model_dir='/root/.paddleocr/whl/cls/ch_ppocr_mobile_v2.0_cls_infer', cls_image_shape='3, 48, 192', label_list=['0', '180'], cls_batch_num=6, cls_thresh=0.9, enable_mkldnn=False, cpu_threads=10, use_pdserving=False, warmup=False, sr_model_dir=None, sr_image_shape='3, 32, 128', sr_batch_num=1, draw_img_save_dir='./inference_results', save_crop_res=False, crop_res_save_dir='./output', use_mp=False, total_process_num=1, process_id=0, benchmark=False, save_log_path='./log_output/', show_log=True, use_onnx=False, return_word_box=False, output='./output', table_max_len=488, table_algorithm='TableAttn', table_model_dir=None, merge_no_span_structure=True, table_char_dict_path=None, layout_model_dir=None, layout_dict_path=None, layout_score_threshold=0.5, layout_nms_threshold=0.5, kie_algorithm='LayoutXLM', ser_model_dir=None, re_model_dir=None, use_visual_backbone=True, ser_dict_path='../train_data/XFUND/class_list_xfun.txt', ocr_order_method=None, mode='structure', image_orientation=False, layout=True, table=True, ocr=True, recovery=False, use_pdf2docx_api=False, invert=False, binarize=False, alphacolor=(255, 255, 255), lang='ch', det=True, rec=True, type='ocr', savefile=False, ocr_version='PP-OCRv4', structure_version='PP-StructureV2')\n[2025/07/02 07:24:17] ppocr DEBUG: dt_boxes num : 51, elapsed : 0.06617093086242676\n[2025/07/02 07:24:17] ppocr DEBUG: cls num  : 51, elapsed : 0.06938791275024414\n[2025/07/02 07:24:17] ppocr DEBUG: rec_res num  : 51, elapsed : 0.17115545272827148",
  "metrics": {
    "predict_time": 4.913220654,
    "total_time": 4.932579
  },
  "output": {
    "results": [
      {
        "box": [
          [
            56,
            256
          ],
          [
            123,
            256
          ],
          [
            123,
            285
          ],
          [
            56,
            285
          ]
        ],
        "text": "日期：",
        "confidence": 0.9920272827148438
      },
      {
        "box": [
          [
            186,
            253
          ],
          [
            281,
            256
          ],
          [
            280,
            291
          ],
          [
            185,
            288
          ]
        ],
        "text": "月2日",
        "confidence": 0.9972589612007141
      },
      {
        "box": [
          [
            77,
            295
          ],
          [
            161,
            295
          ],
          [
            161,
            328
          ],
          [
            77,
            328
          ]
        ],
        "text": "冻品类",
        "confidence": 0.9964981079101562
      },
      {
        "box": [
          [
            233,
            299
          ],
          [
            344,
            299
          ],
          [
            344,
            331
          ],
          [
            233,
            331
          ]
        ],
        "text": "是否进货",
        "confidence": 0.9954186081886292
      },
      {
        "box": [
          [
            412,
            298
          ],
          [
            498,
            303
          ],
          [
            496,
            338
          ],
          [
            410,
            333
          ]
        ],
        "text": "生鲜类",
        "confidence": 0.997840166091919
      },
      {
        "box": [
          [
            613,
            305
          ],
          [
            719,
            305
          ],
          [
            719,
            337
          ],
          [
            613,
            337
          ]
        ],
        "text": "是否进货",
        "confidence": 0.9941408634185791
      },
      {
        "box": [
          [
            52,
            337
          ],
          [
            106,
            337
          ],
          [
            106,
            369
          ],
          [
            52,
            369
          ]
        ],
        "text": "肉丝",
        "confidence": 0.9982274770736694
      },
      {
        "box": [
          [
            410,
            343
          ],
          [
            469,
            343
          ],
          [
            469,
            379
          ],
          [
            410,
            379
          ]
        ],
        "text": "皮蛋",
        "confidence": 0.9982661008834839
      },
      {
        "box": [
          [
            49,
            380
          ],
          [
            103,
            380
          ],
          [
            103,
            411
          ],
          [
            49,
            411
          ]
        ],
        "text": "蒸饺",
        "confidence": 0.9988856911659241
      },
      {
        "box": [
          [
            409,
            384
          ],
          [
            469,
            384
          ],
          [
            469,
            420
          ],
          [
            409,
            420
          ]
        ],
        "text": "大米",
        "confidence": 0.9908667802810669
      },
      {
        "box": [
          [
            42,
            421
          ],
          [
            128,
            421
          ],
          [
            128,
            455
          ],
          [
            42,
            455
          ]
        ],
        "text": "小笼包",
        "confidence": 0.9984879493713379
      },
      {
        "box": [
          [
            405,
            425
          ],
          [
            468,
            429
          ],
          [
            466,
            465
          ],
          [
            403,
            461
          ]
        ],
        "text": "糯米",
        "confidence": 0.9963600635528564
      },
      {
        "box": [
          [
            46,
            465
          ],
          [
            128,
            465
          ],
          [
            128,
            495
          ],
          [
            46,
            495
          ]
        ],
        "text": "小米糕",
        "confidence": 0.9975185394287109
      },
      {
        "box": [
          [
            408,
            466
          ],
          [
            467,
            470
          ],
          [
            464,
            507
          ],
          [
            406,
            503
          ]
        ],
        "text": "鸡蛋",
        "confidence": 0.9997127056121826
      },
      {
        "box": [
          [
            44,
            502
          ],
          [
            101,
            506
          ],
          [
            99,
            543
          ],
          [
            42,
            539
          ]
        ],
        "text": "肉包",
        "confidence": 0.9997159838676453
      },
      {
        "box": [
          [
            406,
            511
          ],
          [
            466,
            511
          ],
          [
            466,
            547
          ],
          [
            406,
            547
          ]
        ],
        "text": "青菜",
        "confidence": 0.777458906173706
      },
      {
        "box": [
          [
            42,
            548
          ],
          [
            99,
            548
          ],
          [
            99,
            580
          ],
          [
            42,
            580
          ]
        ],
        "text": "馒头",
        "confidence": 0.9772971868515015
      },
      {
        "box": [
          [
            406,
            553
          ],
          [
            463,
            553
          ],
          [
            463,
            585
          ],
          [
            406,
            585
          ]
        ],
        "text": "南瓜",
        "confidence": 0.9998009204864502
      },
      {
        "box": [
          [
            42,
            589
          ],
          [
            126,
            589
          ],
          [
            126,
            623
          ],
          [
            42,
            623
          ]
        ],
        "text": "牛肉饼",
        "confidence": 0.9998456835746765
      },
      {
        "box": [
          [
            406,
            600
          ],
          [
            484,
            600
          ],
          [
            484,
            640
          ],
          [
            406,
            640
          ]
        ],
        "text": "纸巾",
        "confidence": 0.9067220091819763
      },
      {
        "box": [
          [
            613,
            599
          ],
          [
            647,
            599
          ],
          [
            647,
            641
          ],
          [
            613,
            641
          ]
        ],
        "text": "文",
        "confidence": 0.5786753296852112
      },
      {
        "box": [
          [
            40,
            631
          ],
          [
            99,
            631
          ],
          [
            99,
            667
          ],
          [
            40,
            667
          ]
        ],
        "text": "油条",
        "confidence": 0.9904474020004272
      },
      {
        "box": [
          [
            406,
            641
          ],
          [
            539,
            641
          ],
          [
            539,
            680
          ],
          [
            406,
            680
          ]
        ],
        "text": "五米淀粉",
        "confidence": 0.7983134984970093
      },
      {
        "box": [
          [
            613,
            647
          ],
          [
            655,
            647
          ],
          [
            655,
            680
          ],
          [
            613,
            680
          ]
        ],
        "text": "V",
        "confidence": 0.5420145392417908
      },
      {
        "box": [
          [
            39,
            672
          ],
          [
            124,
            675
          ],
          [
            122,
            710
          ],
          [
            38,
            706
          ]
        ],
        "text": "南瓜饼",
        "confidence": 0.9998524188995361
      },
      {
        "box": [
          [
            406,
            677
          ],
          [
            490,
            677
          ],
          [
            490,
            723
          ],
          [
            406,
            723
          ]
        ],
        "text": "鸡肉",
        "confidence": 0.9988926649093628
      },
      {
        "box": [
          [
            615,
            691
          ],
          [
            660,
            691
          ],
          [
            660,
            725
          ],
          [
            615,
            725
          ]
        ],
        "text": "V",
        "confidence": 0.6758723855018616
      },
      {
        "box": [
          [
            40,
            716
          ],
          [
            97,
            716
          ],
          [
            97,
            748
          ],
          [
            40,
            748
          ]
        ],
        "text": "咸骨",
        "confidence": 0.965638279914856
      },
      {
        "box": [
          [
            413,
            722
          ],
          [
            595,
            731
          ],
          [
            593,
            769
          ],
          [
            411,
            759
          ]
        ],
        "text": "土豆西红拂",
        "confidence": 0.7807525396347046
      },
      {
        "box": [
          [
            33,
            755
          ],
          [
            197,
            755
          ],
          [
            197,
            797
          ],
          [
            33,
            797
          ]
        ],
        "text": "鲜肉大混沌",
        "confidence": 0.8076324462890625
      },
      {
        "box": [
          [
            402,
            761
          ],
          [
            490,
            766
          ],
          [
            488,
            801
          ],
          [
            400,
            795
          ]
        ],
        "text": "包材类",
        "confidence": 0.9931285381317139
      },
      {
        "box": [
          [
            595,
            766
          ],
          [
            708,
            770
          ],
          [
            707,
            803
          ],
          [
            594,
            800
          ]
        ],
        "text": "是否进货",
        "confidence": 0.9942851066589355
      },
      {
        "box": [
          [
            39,
            806
          ],
          [
            118,
            802
          ],
          [
            120,
            843
          ],
          [
            41,
            847
          ]
        ],
        "text": "烧麦",
        "confidence": 0.6068538427352905
      },
      {
        "box": [
          [
            400,
            803
          ],
          [
            489,
            810
          ],
          [
            487,
            845
          ],
          [
            398,
            838
          ]
        ],
        "text": "打包袋",
        "confidence": 0.9995841383934021
      },
      {
        "box": [
          [
            625,
            813
          ],
          [
            672,
            813
          ],
          [
            672,
            855
          ],
          [
            625,
            855
          ]
        ],
        "text": "V",
        "confidence": 0.5481792092323303
      },
      {
        "box": [
          [
            37,
            844
          ],
          [
            175,
            841
          ],
          [
            176,
            889
          ],
          [
            38,
            892
          ]
        ],
        "text": "川鸡柳",
        "confidence": 0.9422805905342102
      },
      {
        "box": [
          [
            214,
            849
          ],
          [
            250,
            849
          ],
          [
            250,
            885
          ],
          [
            214,
            885
          ]
        ],
        "text": "√",
        "confidence": 0.5601677894592285
      },
      {
        "box": [
          [
            401,
            851
          ],
          [
            483,
            851
          ],
          [
            483,
            885
          ],
          [
            401,
            885
          ]
        ],
        "text": "餐具包",
        "confidence": 0.9883326888084412
      },
      {
        "box": [
          [
            31,
            891
          ],
          [
            145,
            884
          ],
          [
            148,
            928
          ],
          [
            34,
            936
          ]
        ],
        "text": "葱油饼",
        "confidence": 0.6201839447021484
      },
      {
        "box": [
          [
            216,
            889
          ],
          [
            251,
            889
          ],
          [
            251,
            931
          ],
          [
            216,
            931
          ]
        ],
        "text": "文",
        "confidence": 0.673835039138794
      },
      {
        "box": [
          [
            398,
            893
          ],
          [
            461,
            893
          ],
          [
            461,
            929
          ],
          [
            398,
            929
          ]
        ],
        "text": "粥桶",
        "confidence": 0.9909290075302124
      },
      {
        "box": [
          [
            33,
            927
          ],
          [
            184,
            927
          ],
          [
            184,
            975
          ],
          [
            33,
            975
          ]
        ],
        "text": "竿藕灶脊骨",
        "confidence": 0.7467600703239441
      },
      {
        "box": [
          [
            208,
            935
          ],
          [
            241,
            935
          ],
          [
            241,
            975
          ],
          [
            208,
            975
          ]
        ],
        "text": "文",
        "confidence": 0.6752219200134277
      },
      {
        "box": [
          [
            399,
            936
          ],
          [
            552,
            940
          ],
          [
            551,
            972
          ],
          [
            398,
            968
          ]
        ],
        "text": "打包盒（小）",
        "confidence": 0.9927412867546082
      },
      {
        "box": [
          [
            34,
            972
          ],
          [
            171,
            975
          ],
          [
            170,
            1019
          ],
          [
            33,
            1016
          ]
        ],
        "text": "红糖漫头",
        "confidence": 0.900083065032959
      },
      {
        "box": [
          [
            32,
            1020
          ],
          [
            179,
            1020
          ],
          [
            179,
            1067
          ],
          [
            32,
            1067
          ]
        ],
        "text": "甘梅地瓜余",
        "confidence": 0.6869074702262878
      }
    ]
  },
  "started_at": "2025-07-02T07:24:12.854358Z",
  "status": "succeeded",
  "urls": {
    "get": "https://api.replicate.com/v1/predictions/b5g86zmmmdrge0cqs82vyyyew8",
    "cancel": "https://api.replicate.com/v1/predictions/b5g86zmmmdrge0cqs82vyyyew8/cancel",
    "web": "https://replicate.com/p/b5g86zmmmdrge0cqs82vyyyew8"
  },
  "version": "084b779cb09bc2462335a5768fabaeaaba53bb3f70afd0d2fe48fad71fdc4d5a"
};