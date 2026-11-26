import type { AssetCategory } from "./types";

export interface CustomAssetDefinition {
  slug: string;
  filename: string;
  display_name: string;
  description: string;
  keywords_id: string[];
  keywords_en: string[];
  categories: AssetCategory[];
  concepts: string[];
}

export const CUSTOM_SDLB_ASSETS: CustomAssetDefinition[] = [
  {
    slug: "akar-tumbuhan",
    filename: "akar-tumbuhan.webp",
    display_name: "Akar Tumbuhan",
    description: "Ilustrasi bagian akar tumbuhan di dalam tanah yang menyerap air dan mineral.",
    keywords_id: ["akar", "tumbuhan", "bagian tumbuhan", "tanaman", "tanah", "menyerap air"],
    keywords_en: ["root", "plant root", "plant parts", "soil"],
    categories: ["IPA", "Tumbuhan"],
    concepts: ["bagian tumbuhan", "anatomi tumbuhan", "pertumbuhan tanaman"],
  },
  {
    slug: "batang-tumbuhan",
    filename: "batang-tumbuhan.webp",
    display_name: "Batang Tumbuhan",
    description: "Ilustrasi bagian batang tumbuhan yang menopang daun dan menyalurkan air.",
    keywords_id: ["batang", "tumbuhan", "bagian tumbuhan", "tanaman", "ranting", "dahan"],
    keywords_en: ["stem", "stalk", "plant stem", "plant parts"],
    categories: ["IPA", "Tumbuhan"],
    concepts: ["bagian tumbuhan", "anatomi tumbuhan", "struktur tanaman"],
  },
  {
    slug: "daun-hijau",
    filename: "daun-hijau.webp",
    display_name: "Daun Hijau",
    description: "Ilustrasi daun hijau dengan tulang daun sebagai tempat fotosintesis tumbuhan.",
    keywords_id: ["daun", "daun hijau", "bagian tumbuhan", "tumbuhan", "fotosintesis", "klorofil"],
    keywords_en: ["leaf", "green leaf", "leaves", "plant parts", "photosynthesis"],
    categories: ["IPA", "Tumbuhan"],
    concepts: ["bagian tumbuhan", "fotosintesis", "alam"],
  },
  {
    slug: "siklus-air",
    filename: "siklus-air.webp",
    display_name: "Siklus Air",
    description: "Diagram sederhana daur air: penguapan oleh matahari, awan, hujan, dan aliran air.",
    keywords_id: ["siklus air", "daur air", "penguapan", "hujan", "awan", "matahari", "air"],
    keywords_en: ["water cycle", "evaporation", "condensation", "precipitation", "rain"],
    categories: ["IPA", "Lingkungan"],
    concepts: ["daur air", "perubahan wujud", "cuaca dan iklim"],
  },
  {
    slug: "cuaca-cerah",
    filename: "cuaca-cerah.webp",
    display_name: "Cuaca Cerah",
    description: "Ilustrasi cuaca cerah dengan matahari bersinar terang di langit biru.",
    keywords_id: ["cuaca cerah", "cerah", "cuaca", "matahari", "panas", "terang", "siang"],
    keywords_en: ["sunny", "clear weather", "weather", "sunshine", "bright"],
    categories: ["IPA", "Lingkungan"],
    concepts: ["keadaan cuaca", "cuaca", "alam"],
  },
  {
    slug: "cuaca-berawan",
    filename: "cuaca-berawan.webp",
    display_name: "Cuaca Berawan",
    description: "Ilustrasi cuaca berawan dengan awan putih menutupi sebagian matahari.",
    keywords_id: ["cuaca berawan", "berawan", "mendung", "cuaca", "awan", "matahari"],
    keywords_en: ["cloudy", "partly cloudy", "weather", "cloud"],
    categories: ["IPA", "Lingkungan"],
    concepts: ["keadaan cuaca", "cuaca", "alam"],
  },
  {
    slug: "cuaca-badai-petir",
    filename: "cuaca-badai-petir.webp",
    display_name: "Cuaca Hujan Petir",
    description: "Ilustrasi cuaca badai hujan disertai awan gelap dan kilat petir.",
    keywords_id: ["petir", "badai", "kilat", "hujan petir", "cuaca buruk", "cuaca", "hujan"],
    keywords_en: ["thunderstorm", "lightning", "storm", "bad weather", "rain"],
    categories: ["IPA", "Lingkungan", "Keselamatan Diri"],
    concepts: ["keadaan cuaca", "bencana alam", "keselamatan saat hujan"],
  },
  {
    slug: "sistem-pencernaan",
    filename: "sistem-pencernaan.webp",
    display_name: "Sistem Pencernaan",
    description: "Ilustrasi sederhana organ pencernaan manusia: kerongkongan, lambung, dan usus.",
    keywords_id: ["sistem pencernaan", "pencernaan", "lambung", "usus", "kerongkongan", "perut", "makanan"],
    keywords_en: ["digestive system", "digestion", "stomach", "intestine", "human body"],
    categories: ["IPA", "Kesehatan dan Kebersihan"],
    concepts: ["organ tubuh manusia", "sistem pencernaan", "kesehatan tubuh"],
  },
  {
    slug: "jantung-organ",
    filename: "jantung-organ.webp",
    display_name: "Organ Jantung",
    description: "Ilustrasi organ jantung manusia yang memompa darah ke seluruh tubuh.",
    keywords_id: ["jantung", "organ jantung", "peredaran darah", "darah", "organ tubuh", "detak jantung"],
    keywords_en: ["heart", "human heart", "circulatory system", "blood", "organ"],
    categories: ["IPA", "Kesehatan dan Kebersihan"],
    concepts: ["organ tubuh manusia", "peredaran darah", "kesehatan"],
  },
  {
    slug: "paru-paru",
    filename: "paru-paru.webp",
    display_name: "Organ Paru-Paru",
    description: "Ilustrasi organ paru-paru manusia untuk bernapas menghirup oksigen.",
    keywords_id: ["paru-paru", "pernapasan", "bernapas", "oksigen", "organ tubuh", "udara"],
    keywords_en: ["lungs", "respiratory system", "breathing", "oxygen", "organ"],
    categories: ["IPA", "Kesehatan dan Kebersihan"],
    concepts: ["organ tubuh manusia", "sistem pernapasan", "kesehatan"],
  },
  {
    slug: "magnet-tapal-kuda",
    filename: "magnet-tapal-kuda.webp",
    display_name: "Magnet",
    description: "Ilustrasi magnet berbentuk tapal kuda dengan kutub utara (U) dan selatan (S).",
    keywords_id: ["magnet", "gaya magnet", "kutub utara", "kutub selatan", "menarik logam"],
    keywords_en: ["magnet", "magnetism", "north pole", "south pole", "force"],
    categories: ["IPA"],
    concepts: ["gaya dan gerak", "energi", "benda magnetis"],
  },
  {
    slug: "penjumlahan",
    filename: "penjumlahan.webp",
    display_name: "Penjumlahan",
    description: "Ilustrasi operasi hitung penjumlahan visual 2 + 1 = 3 dengan buah apel.",
    keywords_id: ["penjumlahan", "tambah", "ditambah", "jumlah", "operasi hitung", "matematika"],
    keywords_en: ["addition", "plus", "add", "sum", "math"],
    categories: ["Matematika"],
    concepts: ["operasi hitung", "berhitung dasar", "penjumlahan"],
  },
  {
    slug: "pengurangan",
    filename: "pengurangan.webp",
    display_name: "Pengurangan",
    description: "Ilustrasi operasi hitung pengurangan visual 3 - 1 = 2 dengan buah jeruk.",
    keywords_id: ["pengurangan", "kurang", "dikurangi", "selisih", "operasi hitung", "matematika"],
    keywords_en: ["subtraction", "minus", "subtract", "difference", "math"],
    categories: ["Matematika"],
    concepts: ["operasi hitung", "berhitung dasar", "pengurangan"],
  },
  {
    slug: "perkalian",
    filename: "perkalian.webp",
    display_name: "Perkalian",
    description: "Ilustrasi operasi hitung perkalian visual 2 x 2 = 4 dengan pengelompokan.",
    keywords_id: ["perkalian", "kali", "dikali", "kelipatan", "operasi hitung", "matematika"],
    keywords_en: ["multiplication", "times", "multiply", "groups", "math"],
    categories: ["Matematika"],
    concepts: ["operasi hitung", "berhitung dasar", "perkalian"],
  },
  {
    slug: "pembagian",
    filename: "pembagian.webp",
    display_name: "Pembagian",
    description: "Ilustrasi operasi hitung pembagian visual 4 : 2 = 2 berbagi sama rata.",
    keywords_id: ["pembagian", "bagi", "dibagi", "sama rata", "operasi hitung", "matematika"],
    keywords_en: ["division", "divide", "share equally", "math"],
    categories: ["Matematika"],
    concepts: ["operasi hitung", "berhitung dasar", "pembagian"],
  },
  {
    slug: "pecahan-setengah",
    filename: "pecahan-setengah.webp",
    display_name: "Pecahan Setengah (1/2)",
    description: "Ilustrasi pecahan 1/2 (setengah) berupa lingkaran yang dibagi dua sama besar.",
    keywords_id: ["pecahan", "setengah", "satu per dua", "1/2", "separuh", "bagian"],
    keywords_en: ["fraction", "half", "one half", "1/2", "parts"],
    categories: ["Matematika"],
    concepts: ["pecahan sederhana", "bagian dari keseluruhan", "berhitung"],
  },
  {
    slug: "pecahan-seperempat",
    filename: "pecahan-seperempat.webp",
    display_name: "Pecahan Seperempat (1/4)",
    description: "Ilustrasi pecahan 1/4 (seperempat) berupa lingkaran yang dibagi empat sama besar.",
    keywords_id: ["pecahan", "seperempat", "satu per empat", "1/4", "bagian"],
    keywords_en: ["fraction", "quarter", "one fourth", "1/4", "parts"],
    categories: ["Matematika"],
    concepts: ["pecahan sederhana", "bagian dari keseluruhan", "berhitung"],
  },
  {
    slug: "persegi-panjang",
    filename: "persegi-panjang.webp",
    display_name: "Persegi Panjang",
    description: "Ilustrasi bangun datar persegi panjang dengan empat sisi dan empat sudut siku-siku.",
    keywords_id: ["persegi panjang", "bangun datar", "bentuk geometri", "segi empat", "geometri"],
    keywords_en: ["rectangle", "shape", "geometry", "flat shape"],
    categories: ["Matematika"],
    concepts: ["bangun datar", "bentuk geometri"],
  },
  {
    slug: "kubus-geometri",
    filename: "kubus-geometri.webp",
    display_name: "Kubus",
    description: "Ilustrasi bangun ruang kubus tiga dimensi dengan enam sisi persegi yang sama.",
    keywords_id: ["kubus", "bangun ruang", "geometri", "bentuk 3d", "kotak"],
    keywords_en: ["cube", "3d shape", "geometry", "solid shape"],
    categories: ["Matematika"],
    concepts: ["bangun ruang", "bentuk geometri"],
  },
  {
    slug: "gotong-royong",
    filename: "gotong-royong.webp",
    display_name: "Gotong Royong",
    description: "Ilustrasi dua anak bekerja sama mengangkat kotak dalam semangat gotong royong.",
    keywords_id: ["gotong royong", "kerja sama", "tolong menolong", "membantu", "kebersamaan", "pancasila"],
    keywords_en: ["cooperation", "teamwork", "helping together", "mutual aid"],
    categories: ["Pendidikan Pancasila", "Kegiatan Sosial"],
    concepts: ["nilai pancasila", "kerja sama", "kerukunan"],
  },
  {
    slug: "musyawarah",
    filename: "musyawarah.webp",
    display_name: "Musyawarah",
    description: "Ilustrasi anak-anak duduk bersama berdiskusi untuk mencapai mufakat.",
    keywords_id: ["musyawarah", "diskusi", "mufakat", "rapat", "berpendapat", "pancasila"],
    keywords_en: ["discussion", "deliberation", "consensus", "meeting"],
    categories: ["Pendidikan Pancasila", "Kegiatan Sosial"],
    concepts: ["nilai pancasila", "sila keempat", "demokrasi anak"],
  },
  {
    slug: "upacara-bendera",
    filename: "upacara-bendera.webp",
    display_name: "Upacara Bendera",
    description: "Ilustrasi bendera Merah Putih berkibar di tiang untuk kegiatan upacara bendera.",
    keywords_id: ["upacara bendera", "bendera merah putih", "upacara", "nasionalisme", "sekolah", "pancasila"],
    keywords_en: ["flag ceremony", "national flag", "ceremony", "school"],
    categories: ["Pendidikan Pancasila", "IPS", "Benda di Sekolah"],
    concepts: ["cinta tanah air", "kegiatan sekolah", "simbol negara"],
  },
  {
    slug: "lampu-lalu-lintas",
    filename: "lampu-lalu-lintas.webp",
    display_name: "Lampu Lalu Lintas",
    description: "Ilustrasi lampu lalu lintas dengan warna merah (berhenti), kuning (hati-hati), dan hijau (jalan).",
    keywords_id: ["lampu lalu lintas", "lampu merah", "rambu lalu lintas", "jalan raya", "aturan jalan", "keselamatan"],
    keywords_en: ["traffic light", "traffic signal", "road safety", "stop light"],
    categories: ["IPS", "Transportasi", "Keselamatan Diri"],
    concepts: ["aturan lalu lintas", "keselamatan jalan", "tempat umum"],
  },
  {
    slug: "pemadam-kebakaran",
    filename: "pemadam-kebakaran.webp",
    display_name: "Pemadam Kebakaran",
    description: "Ilustrasi mobil pemadam kebakaran berwarna merah untuk membantu memadamkan api.",
    keywords_id: ["pemadam kebakaran", "mobil pemadam", "damkar", "profesi", "darurat", "keselamatan"],
    keywords_en: ["fire truck", "firefighter", "emergency", "profession"],
    categories: ["Profesi", "Transportasi", "Keselamatan Diri"],
    concepts: ["layanan darurat", "profesi penolong", "keselamatan"],
  },
];

/**
 * Bidirectional educational keyword translations & synonyms (ID <-> EN).
 * Used both to enrich catalog entries and to expand search queries locally.
 */
export const ID_EN_TRANSLATIONS: Record<string, string[]> = {
  // Numbers & Math
  "0": ["nol", "kosong", "zero", "nought"],
  "1": ["satu", "one", "pertama", "first"],
  "2": ["dua", "two", "kedua", "second"],
  "3": ["tiga", "three", "ketiga", "third"],
  "4": ["empat", "four"],
  "5": ["lima", "five"],
  "6": ["enam", "six"],
  "7": ["tujuh", "seven"],
  "8": ["delapan", "eight"],
  "9": ["sembilan", "nine"],
  "10": ["sepuluh", "ten"],
  nought: ["nol", "kosong", "0"],
  one: ["satu", "1", "angka satu"],
  first: ["pertama", "kesatu", "urutan"],
  second: ["kedua", "urutan"],
  third: ["ketiga", "urutan"],
  last: ["terakhir", "akhir"],
  count: ["hitung", "menghitung", "berhitung", "angka"],
  calculate: ["hitung", "menghitung", "matematika", "kalkulasi"],
  divide: ["bagi", "pembagian", "membagi"],
  many: ["banyak", "jumlah banyak"],
  few: ["sedikit", "jumlah sedikit"],
  more: ["lebih banyak", "tambah"],
  less: ["lebih sedikit", "kurang"],
  equal: ["sama", "sama dengan", "setara"],
  uneven: ["tidak sama", "berbeda"],
  weigh: ["timbang", "menimbang", "berat", "timbangan"],
  long: ["panjang", "ukuran"],
  short: ["pendek", "ukuran"],
  tall: ["tinggi", "ukuran"],
  wide: ["lebar", "luas"],
  narrow: ["sempit"],
  thick: ["tebal"],
  thin: ["tipis"],
  fat: ["gemuk", "tebal"],
  slim: ["kurus", "ramping"],
  full: ["penuh"],
  empty: ["kosong"],
  none: ["tidak ada", "kosong"],
  some: ["beberapa", "sebagian"],

  // Animals
  kucing: ["cat", "hewan peliharaan", "binatang"],
  anjing: ["dog", "hewan peliharaan", "binatang"],
  burung: ["bird", "unggas", "binatang"],
  sapi: ["cow", "ternak", "binatang"],
  kambing: ["goat", "ternak", "binatang"],
  kelinci: ["rabbit", "hewan", "binatang"],
  bebek: ["duck", "unggas", "binatang"],
  kuda: ["horse", "hewan", "binatang", "gallop"],
  gajah: ["elephant", "hewan liar", "binatang"],
  monyet: ["monkey", "hewan", "binatang"],
  "kupu-kupu": ["butterfly", "serangga", "hewan"],
  ikan: ["fish", "hewan air", "lauk"],
  ayam: ["chicken", "unggas", "hewan"],

  // Plants & Nature & Weather
  pohon: ["tree", "tumbuhan", "tanaman", "hutan"],
  bunga: ["flower", "tumbuhan", "tanaman"],
  rumput: ["grass", "tumbuhan", "tanaman"],
  matahari: ["sun", "cuaca cerah", "sinar"],
  bulan: ["moon", "malam", "langit"],
  bintang: ["star", "malam", "langit"],
  awan: ["cloud", "cuaca", "langit"],
  hujan: ["rain", "cuaca", "air hujan"],
  panas: ["hot", "cuaca panas", "suhu"],
  dingin: ["cold", "cuaca dingin", "suhu"],
  angin: ["wind", "cuaca", "udara"],
  pelangi: ["rainbow", "warna", "langit"],
  gunung: ["mountain", "alam", "lingkungan"],
  sungai: ["river", "air", "alam", "lingkungan"],
  laut: ["sea", "ocean", "air", "alam"],
  pantai: ["beach", "laut", "pasir"],
  pasir: ["sand", "tanah"],
  batu: ["stone", "rock", "alam"],
  tanah: ["soil", "ground", "bumi"],

  // Transport & Places
  mobil: ["car", "kendaraan", "transportasi"],
  sepeda: ["bicycle", "bike", "kendaraan", "transportasi"],
  motor: ["motorcycle", "sepeda motor", "transportasi"],
  bus: ["bis", "angkutan umum", "transportasi"],
  kereta: ["train", "kereta api", "transportasi"],
  pesawat: ["airplane", "plane", "terbang", "transportasi"],
  kapal: ["ship", "boat", "perahu", "transportasi"],
  truk: ["truck", "kendaraan", "transportasi"],
  drive: ["mengemudi", "menyetir", "mobil"],
  ride: ["mengendarai", "naik kendaraan"],
  "ride-a-bike": ["naik sepeda", "bersepeda"],
  "get-on-bus": ["naik bus", "bus", "transportasi"],
  "get-off-the-bus": ["turun bus", "bus", "transportasi"],
  "get-into-the-car": ["masuk mobil", "mobil"],
  "get-off-the-car": ["keluar mobil", "mobil"],
  "get-off-the-train": ["turun kereta", "kereta"],
  "wait-at-bus-stop": ["halte bus", "menunggu bus", "antre"],
  airport: ["bandara", "pesawat", "tempat umum"],
  sail: ["berlayar", "kapal", "perahu"],
  honk: ["klakson", "bunyi kendaraan"],
  refuel: ["isi bensin", "bahan bakar"],
  "zebra-cross": ["penyeberangan jalan", "zebra cross", "keselamatan jalan"],
  tikungan: ["belokan jalan", "rambu lalu lintas"],

  // School & Learning
  buku: ["book", "baca", "alat tulis"],
  pensil: ["pencil", "tulis", "alat tulis"],
  penghapus: ["eraser", "alat tulis"],
  tas: ["bag", "tas sekolah", "sekolah"],
  meja: ["table", "desk", "perabot"],
  kursi: ["chair", "duduk", "perabot"],
  guru: ["teacher", "pengajar", "profesi", "sekolah"],
  siswa: ["student", "murid", "pelajar", "sekolah"],
  sekolah: ["school", "belajar", "tempat belajar"],
  school: ["sekolah", "belajar"],
  preschool: ["paud", "tk", "sekolah"],
  menulis: ["write", "tulis", "belajar"],
  write: ["menulis", "tulis"],
  membaca: ["read", "baca", "belajar"],
  read: ["membaca", "baca"],
  menggambar: ["draw", "gambar", "seni"],
  draw: ["menggambar", "gambar"],
  paint: ["melukis", "mewarnai", "cat", "seni"],
  study: ["belajar", "sekolah"],
  gunting: ["scissors", "potong", "alat tulis"],
  cut: ["potong", "memotong", "gunting"],
  lem: ["glue", "perekat", "alat tulis"],
  paste: ["menempel", "lem"],
  penggaris: ["ruler", "ukur", "alat tulis"],
  komputer: ["computer", "laptop", "teknologi"],
  "papan-tulis": ["blackboard", "whiteboard", "kelas"],
  spidol: ["marker", "alat tulis"],
  kertas: ["paper", "alat tulis"],
  "kotak-pensil": ["pencil case", "alat tulis"],
  bendera: ["flag", "merah putih", "upacara"],
  seragam: ["uniform", "baju sekolah"],
  perpustakaan: ["library", "buku", "membaca"],
  library: ["perpustakaan", "buku"],
  kantin: ["canteen", "makan", "sekolah"],
  lapangan: ["field", "olahraga", "bermain"],

  // Health, Body & Hygiene
  air: ["water", "minum", "bersih"],
  "cuci-tangan": ["wash hands", "kebersihan", "tangan"],
  sabun: ["soap", "cuci", "kebersihan"],
  soap: ["sabun", "cuci"],
  "gosok-tangan": ["rub hands", "cuci tangan"],
  bilas: ["rinse", "membilas", "air"],
  rinse: ["bilas", "membilas"],
  handuk: ["towel", "lap", "kering"],
  keringkan: ["dry", "mengeringkan"],
  dry: ["kering", "keringkan"],
  "sikat-gigi": ["toothbrush", "gosok gigi", "kebersihan"],
  "brush-teeth": ["sikat gigi", "gosok gigi", "gigi"],
  "pasta-gigi": ["toothpaste", "odol", "gigi"],
  odol: ["pasta gigi", "toothpaste"],
  mandi: ["bath", "shower", "kebersihan diri"],
  bath: ["mandi", "bak mandi"],
  bathe: ["mandi"],
  "have-a-shower": ["mandi", "pancuran"],
  sampo: ["shampoo", "rambut", "mandi"],
  sisir: ["comb", "rambut", "rapi"],
  comb: ["sisir", "menyisir"],
  toilet: ["wc", "kamar mandi", "buang air"],
  tisu: ["tissue", "lap"],
  dokter: ["doctor", "kesehatan", "profesi"],
  obat: ["medicine", "kesehatan", "sakit"],
  sakit: ["ill", "sick", "hurt", "nyeri"],
  ill: ["sakit", "tidak sehat"],
  hurt: ["terluka", "sakit", "nyeri"],
  healthy: ["sehat", "kesehatan", "bugar"],
  "rumah-sakit": ["hospital", "infirmary", "kesehatan"],
  infirmary: ["uks", "klinik", "ruang kesehatan"],
  pharmacy: ["apotek", "obat"],
  mata: ["eye", "melihat", "pancaindra"],
  telinga: ["ear", "mendengar", "pancaindra"],
  hidung: ["nose", "mencium", "pancaindra"],
  mulut: ["mouth", "bicara", "makan"],
  tangan: ["hand", "tubuh"],
  kaki: ["foot", "leg", "berjalan"],
  gigi: ["tooth", "teeth", "mulut"],
  kepala: ["head", "tubuh"],
  rambut: ["hair", "kepala"],
  leher: ["neck", "tubuh"],
  perut: ["stomach", "belly", "pencernaan"],
  jari: ["finger", "tangan"],
  lidah: ["tongue", "mengecap", "pancaindra"],

  // Emotions & Behavior
  senang: ["happy", "gembira", "bahagia"],
  happy: ["senang", "bahagia", "gembira"],
  content: ["puas", "senang", "tenang"],
  rejoice: ["bersukacita", "senang", "gembira"],
  pleasant: ["menyenangkan", "ramah", "senang"],
  fun: ["seru", "menyenangkan", "bermain"],
  sedih: ["sad", "murung", "menangis"],
  sad: ["sedih", "murung"],
  sadden: ["sedih", "bersedih"],
  downhearted: ["murung", "sedih", "kecewa"],
  marah: ["angry", "kesal", "emosi"],
  angry: ["marah", "kesal"],
  furious: ["sangat marah", "murka"],
  tenang: ["calm", "sabar", "damai"],
  calm: ["tenang", "sabar"],
  "calm-down": ["menenangkan diri", "tenang"],
  quiet: ["tenang", "hening", "diam"],
  takut: ["scared", "afraid", "cemas"],
  scared: ["takut", "ketakutan"],
  frightened: ["takut", "terkejut"],
  confused: ["bingung", "kebingungan"],
  confuse: ["bingung", "membingungkan"],
  tired: ["lelah", "capek", "mengantuk"],
  lelah: ["tired", "capek"],
  shy: ["malu", "pemalu"],
  ashamed: ["malu", "menyesal"],
  embarrass: ["malu", "canggung"],
  anxious: ["cemas", "gelisah", "khawatir"],
  worried: ["khawatir", "cemas"],
  worry: ["khawatir", "cemas"],
  nervous: ["gugup", "grogi", "cemas"],
  surprised: ["terkejut", "kaget", "heran"],
  bored: ["bosan", "jenuh"],
  boring: ["membosankan", "bosan"],
  love: ["cinta", "sayang", "kasih"],
  like: ["suka", "gemar"],
  dislike: ["tidak suka"],
  hate: ["benci", "tidak suka"],

  // Professions & Social & Places
  polisi: ["police", "keamanan", "profesi"],
  tentara: ["soldier", "tni", "profesi"],
  petani: ["farmer", "sawah", "profesi"],
  koki: ["chef", "cook", "memasak", "profesi"],
  teman: ["friend", "sahabat", "sosial"],
  bayi: ["baby", "keluarga"],
  ayah: ["father", "dad", "keluarga"],
  ibu: ["mother", "mom", "keluarga"],
  kakek: ["grandfather", "keluarga"],
  nenek: ["grandmother", "keluarga"],
  kakak: ["older sibling", "keluarga"],
  adik: ["younger sibling", "keluarga"],
  anak: ["child", "kid", "keluarga"],
  pasar: ["market", "belanja", "tempat umum"],
  toko: ["shop", "store", "belanja"],
  taman: ["park", "garden", "bermain"],
  masjid: ["mosque", "ibadah", "tempat ibadah"],
  gereja: ["church", "ibadah", "tempat ibadah"],
  "wait-in-a-line": ["antre", "mengantre", "tertib", "baris"],
  celebrate: ["merayakan", "perayaan", "pesta"],
  visit: ["berkunjung", "mengunjungi", "tamu"],
  invite: ["mengundang", "mengajak"],

  // Food & Drink
  makan: ["eat", "makanan"],
  eat: ["makan", "makanan"],
  minum: ["drink", "minuman"],
  drink: ["minum", "minuman"],
  nasi: ["rice", "makanan pokok"],
  roti: ["bread", "makanan"],
  susu: ["milk", "minuman sehat"],
  buah: ["fruit", "buah-buahan", "sehat"],
  sayur: ["vegetable", "sayuran", "sehat"],
  apel: ["apple", "buah"],
  pisang: ["banana", "buah"],
  jeruk: ["orange", "buah"],
  telur: ["egg", "protein", "makanan"],
  teh: ["tea", "minuman"],
  jus: ["juice", "minuman"],
  sup: ["soup", "makanan"],
  mie: ["noodle", "makanan"],
  daging: ["meat", "protein"],
  keju: ["cheese", "makanan"],
  biskuit: ["biscuit", "cookie", "camilan"],
  permen: ["candy", "manis"],
  cabai: ["chili", "pedas", "sayur"],
  hungry: ["lapar", "ingin makan"],
  lapar: ["hungry", "makan"],
  haus: ["thirsty", "ingin minum"],
  thirsty: ["haus", "minum"],
  sweet: ["manis", "rasa"],
  salty: ["asin", "rasa"],
  kitchen: ["dapur", "memasak"],
  "dining-room": ["ruang makan", "makan"],

  // Daily Actions & Home
  duduk: ["sit", "kursi"],
  berdiri: ["stand", "tegak"],
  stand: ["berdiri"],
  jalan: ["walk", "berjalan"],
  walk: ["jalan", "berjalan"],
  lari: ["run", "berlari", "olahraga"],
  run: ["lari", "berlari"],
  tidur: ["sleep", "istirahat"],
  sleep: ["tidur", "istirahat"],
  bangun: ["wake up", "get up", "pagi"],
  "get-up": ["bangun", "bangun tidur"],
  bermain: ["play", "main"],
  play: ["bermain", "main"],
  membantu: ["help", "menolong", "tolong"],
  buka: ["open", "membuka"],
  open: ["buka", "membuka"],
  tutup: ["close", "menutup"],
  close: ["tutup", "menutup"],
  closed: ["tertutup", "tutup"],
  berdoa: ["pray", "doa", "ibadah"],
  bernyanyi: ["sing", "nyanyi", "musik"],
  sing: ["bernyanyi", "nyanyi"],
  menari: ["dance", "tari", "seni"],
  berenang: ["swim", "renang", "olahraga"],
  swim: ["berenang", "renang"],
  melompat: ["jump", "lompat", "olahraga"],
  jump: ["melompat", "lompat"],
  mendengar: ["hear", "listen", "telinga"],
  hear: ["mendengar", "dengar"],
  melihat: ["see", "look", "mata"],
  bicara: ["speak", "talk", "mulut"],
  tersenyum: ["smile", "senyum"],
  tertawa: ["laugh", "tawa"],
  rumah: ["house", "home", "tempat tinggal"],
  pintu: ["door", "rumah"],
  jendela: ["window", "rumah"],
  "tempat-tidur": ["bed", "kasur", "tidur"],
  bedroom: ["kamar tidur", "tidur"],
  sapu: ["broom", "menyapu", "kebersihan"],
  sampah: ["trash", "garbage", "kebersihan"],
  sepatu: ["shoes", "alas kaki"],
  baju: ["clothes", "shirt", "pakaian"],
  dress: ["berpakaian", "baju", "gaun"],
  dressed: ["berpakaian", "memakai baju"],
  celana: ["pants", "trousers", "pakaian"],
  topi: ["hat", "cap", "pakaian"],
  jaket: ["jacket", "pakaian"],
  kaos: ["t-shirt", "pakaian"],
  "kaos-kaki": ["socks", "pakaian"],
  kacamata: ["glasses", "mata"],
  lampu: ["lamp", "light", "cahaya"],
  jam: ["clock", "watch", "waktu"],
  time: ["waktu", "jam"],
  uang: ["money", "rupiah", "ekonomi"],
  ponsel: ["phone", "handphone", "komunikasi"],
  koran: ["newspaper", "berita", "membaca"],
  piring: ["plate", "alat makan"],
  sendok: ["spoon", "alat makan"],
  garpu: ["fork", "alat makan"],
  gelas: ["glass", "cup", "alat minum"],

  // Colors & Shapes
  merah: ["red", "warna"],
  kuning: ["yellow", "warna"],
  hijau: ["green", "warna"],
  biru: ["blue", "warna"],
  hitam: ["black", "warna"],
  putih: ["white", "warna"],
  cokelat: ["brown", "warna"],
  ungu: ["purple", "warna"],
  oranye: ["orange", "warna"],
  "abu-abu": ["gray", "grey", "warna"],
  "merah-muda": ["pink", "warna"],
  lingkaran: ["circle", "bulat", "bangun datar"],
  segitiga: ["triangle", "bangun datar"],
  kotak: ["square", "box", "persegi", "bangun datar"],
  bola: ["ball", "bulat", "olahraga"],
};

const EXACT_CATEGORY_MAP: Record<string, AssetCategory[]> = {
  // Math & Numbers
  lingkaran: ["Matematika"],
  segitiga: ["Matematika"],
  kotak: ["Matematika", "Benda di Rumah"],
  uang: ["Matematika", "IPS", "Kehidupan Sehari-hari"],
  jam: ["Matematika", "Benda di Rumah", "Kehidupan Sehari-hari"],
  time: ["Matematika", "Kehidupan Sehari-hari"],
  count: ["Matematika"],
  calculate: ["Matematika"],
  divide: ["Matematika"],
  weigh: ["Matematika", "IPA"],
  equal: ["Matematika"],
  uneven: ["Matematika"],
  many: ["Matematika"],
  few: ["Matematika"],
  more: ["Matematika"],
  less: ["Matematika"],
  nought: ["Matematika"],
  one: ["Matematika"],
  first: ["Matematika", "Bahasa Indonesia"],
  second: ["Matematika", "Bahasa Indonesia"],
  third: ["Matematika", "Bahasa Indonesia"],
  last: ["Matematika", "Bahasa Indonesia"],

  // Animals
  kucing: ["Hewan", "IPA"],
  anjing: ["Hewan", "IPA"],
  burung: ["Hewan", "IPA"],
  sapi: ["Hewan", "IPA"],
  kambing: ["Hewan", "IPA"],
  kelinci: ["Hewan", "IPA"],
  bebek: ["Hewan", "IPA"],
  kuda: ["Hewan", "IPA"],
  gajah: ["Hewan", "IPA"],
  monyet: ["Hewan", "IPA"],
  "kupu-kupu": ["Hewan", "IPA", "Lingkungan"],
  ikan: ["Hewan", "Makanan dan Minuman", "IPA"],
  ayam: ["Hewan", "Makanan dan Minuman", "IPA"],

  // Plants & Environment & Weather
  pohon: ["Tumbuhan", "Lingkungan", "IPA"],
  bunga: ["Tumbuhan", "Lingkungan", "IPA"],
  rumput: ["Tumbuhan", "Lingkungan"],
  gunung: ["Lingkungan", "IPS", "IPA"],
  sungai: ["Lingkungan", "IPS", "IPA"],
  laut: ["Lingkungan", "IPS", "IPA"],
  pantai: ["Lingkungan", "IPS"],
  pasir: ["Lingkungan", "IPA"],
  batu: ["Lingkungan", "IPA"],
  tanah: ["Lingkungan", "IPA", "Tumbuhan"],
  matahari: ["IPA", "Lingkungan"],
  bulan: ["IPA", "Lingkungan"],
  bintang: ["IPA", "Lingkungan"],
  awan: ["IPA", "Lingkungan"],
  hujan: ["IPA", "Lingkungan"],
  panas: ["IPA", "Lingkungan"],
  dingin: ["IPA", "Lingkungan"],
  pelangi: ["IPA", "Lingkungan", "Seni dan Budaya"],
  angin: ["IPA", "Lingkungan"],

  // Transport & Safety
  mobil: ["Transportasi"],
  sepeda: ["Transportasi", "Pendidikan Jasmani"],
  motor: ["Transportasi"],
  bus: ["Transportasi", "IPS"],
  kereta: ["Transportasi", "IPS"],
  pesawat: ["Transportasi", "IPS"],
  kapal: ["Transportasi", "IPS"],
  truk: ["Transportasi"],
  "zebra-cross": ["Keselamatan Diri", "Transportasi", "IPS"],
  tikungan: ["Keselamatan Diri", "Transportasi"],
  accident: ["Keselamatan Diri", "Transportasi"],

  // Professions
  guru: ["Profesi", "Benda di Sekolah", "IPS"],
  polisi: ["Profesi", "IPS", "Keselamatan Diri"],
  tentara: ["Profesi", "IPS"],
  petani: ["Profesi", "IPS"],
  koki: ["Profesi", "Makanan dan Minuman"],
  dokter: ["Profesi", "Kesehatan dan Kebersihan"],
  concierge: ["Profesi"],
  caretaker: ["Profesi"],
  conductor: ["Profesi", "Transportasi"],
  psychiatrist: ["Profesi", "Kesehatan dan Kebersihan"],
  "paediatric-psychiatrist": ["Profesi", "Kesehatan dan Kebersihan"],

  // School
  siswa: ["Benda di Sekolah", "Kegiatan Sosial"],
  sekolah: ["Benda di Sekolah", "IPS"],
  school: ["Benda di Sekolah", "IPS"],
  preschool: ["Benda di Sekolah", "IPS"],
  buku: ["Benda di Sekolah", "Bahasa Indonesia"],
  pensil: ["Benda di Sekolah", "Bahasa Indonesia"],
  penghapus: ["Benda di Sekolah"],
  tas: ["Benda di Sekolah"],
  meja: ["Benda di Sekolah", "Benda di Rumah"],
  kursi: ["Benda di Sekolah", "Benda di Rumah"],
  gunting: ["Benda di Sekolah", "Seni dan Budaya"],
  lem: ["Benda di Sekolah", "Seni dan Budaya"],
  penggaris: ["Benda di Sekolah", "Matematika"],
  komputer: ["Benda di Sekolah", "Benda di Rumah"],
  "papan-tulis": ["Benda di Sekolah"],
  spidol: ["Benda di Sekolah", "Seni dan Budaya"],
  kertas: ["Benda di Sekolah", "Seni dan Budaya"],
  "kotak-pensil": ["Benda di Sekolah"],
  bendera: ["Pendidikan Pancasila", "Benda di Sekolah"],
  seragam: ["Benda di Sekolah", "Kehidupan Sehari-hari"],
  perpustakaan: ["Benda di Sekolah", "Bahasa Indonesia", "IPS"],
  library: ["Benda di Sekolah", "Bahasa Indonesia", "IPS"],
  kantin: ["Benda di Sekolah", "Makanan dan Minuman"],
  lapangan: ["Pendidikan Jasmani", "Benda di Sekolah"],
  menulis: ["Bahasa Indonesia", "Benda di Sekolah"],
  write: ["Bahasa Indonesia", "Benda di Sekolah"],
  membaca: ["Bahasa Indonesia", "Benda di Sekolah"],
  read: ["Bahasa Indonesia", "Benda di Sekolah"],
  menggambar: ["Seni dan Budaya", "Benda di Sekolah"],
  draw: ["Seni dan Budaya", "Benda di Sekolah"],
  paint: ["Seni dan Budaya"],
  study: ["Bahasa Indonesia", "Benda di Sekolah"],

  // Food & Drink
  makan: ["Makanan dan Minuman", "Kehidupan Sehari-hari"],
  minum: ["Makanan dan Minuman", "Kehidupan Sehari-hari"],
  nasi: ["Makanan dan Minuman"],
  roti: ["Makanan dan Minuman"],
  susu: ["Makanan dan Minuman", "Kesehatan dan Kebersihan"],
  buah: ["Makanan dan Minuman", "Tumbuhan", "Kesehatan dan Kebersihan"],
  sayur: ["Makanan dan Minuman", "Tumbuhan", "Kesehatan dan Kebersihan"],
  apel: ["Makanan dan Minuman", "Tumbuhan"],
  pisang: ["Makanan dan Minuman", "Tumbuhan"],
  jeruk: ["Makanan dan Minuman", "Tumbuhan"],
  telur: ["Makanan dan Minuman"],
  teh: ["Makanan dan Minuman"],
  jus: ["Makanan dan Minuman"],
  sup: ["Makanan dan Minuman"],
  mie: ["Makanan dan Minuman"],
  daging: ["Makanan dan Minuman"],
  keju: ["Makanan dan Minuman"],
  biskuit: ["Makanan dan Minuman"],
  permen: ["Makanan dan Minuman"],
  cabai: ["Makanan dan Minuman", "Tumbuhan"],
  piring: ["Benda di Rumah", "Makanan dan Minuman"],
  sendok: ["Benda di Rumah", "Makanan dan Minuman"],
  garpu: ["Benda di Rumah", "Makanan dan Minuman"],
  gelas: ["Benda di Rumah", "Makanan dan Minuman"],
  minyak: ["Makanan dan Minuman", "Benda di Rumah"],

  // Colors -> Seni dan Budaya / Bahasa Indonesia
  merah: ["Seni dan Budaya", "Bahasa Indonesia"],
  kuning: ["Seni dan Budaya", "Bahasa Indonesia"],
  hijau: ["Seni dan Budaya", "Bahasa Indonesia"],
  biru: ["Seni dan Budaya", "Bahasa Indonesia"],
  hitam: ["Seni dan Budaya", "Bahasa Indonesia"],
  putih: ["Seni dan Budaya", "Bahasa Indonesia"],
  cokelat: ["Seni dan Budaya", "Bahasa Indonesia"],
  ungu: ["Seni dan Budaya", "Bahasa Indonesia"],
  oranye: ["Seni dan Budaya", "Bahasa Indonesia"],
  "abu-abu": ["Seni dan Budaya", "Bahasa Indonesia"],
  "merah-muda": ["Seni dan Budaya", "Bahasa Indonesia"],

  // Sports & Arts
  bola: ["Pendidikan Jasmani"],
  berenang: ["Pendidikan Jasmani"],
  swim: ["Pendidikan Jasmani"],
  melompat: ["Pendidikan Jasmani"],
  jump: ["Pendidikan Jasmani"],
  lari: ["Pendidikan Jasmani"],
  run: ["Pendidikan Jasmani"],
  bernyanyi: ["Seni dan Budaya"],
  sing: ["Seni dan Budaya"],
  menari: ["Seni dan Budaya"],
  "dance-and-music-school": ["Seni dan Budaya"],
  "art-school": ["Seni dan Budaya"],
  conservatory: ["Seni dan Budaya"],
  gymnasium: ["Pendidikan Jasmani"],

  // Social & Places & Pancasila
  berdoa: ["Pendidikan Pancasila", "Kegiatan Sosial"],
  membantu: ["Pendidikan Pancasila", "Kegiatan Sosial"],
  teman: ["Kegiatan Sosial"],
  keluarga: ["Kegiatan Sosial", "IPS"],
  ayah: ["Kegiatan Sosial", "IPS"],
  ibu: ["Kegiatan Sosial", "IPS"],
  kakek: ["Kegiatan Sosial", "IPS"],
  nenek: ["Kegiatan Sosial", "IPS"],
  kakak: ["Kegiatan Sosial", "IPS"],
  adik: ["Kegiatan Sosial", "IPS"],
  anak: ["Kegiatan Sosial", "IPS"],
  bayi: ["Kegiatan Sosial", "IPS"],
  pasar: ["IPS", "Kegiatan Sosial"],
  toko: ["IPS", "Kehidupan Sehari-hari"],
  taman: ["Lingkungan", "Kegiatan Sosial"],
  masjid: ["Pendidikan Pancasila", "Kegiatan Sosial", "IPS"],
  gereja: ["Pendidikan Pancasila", "Kegiatan Sosial", "IPS"],
};

/**
 * Strip trailing numeric ARASAAC suffix like `-35541` to recover canonical stem.
 */
export function getCanonicalKey(slug: string): string {
  return slug.replace(/-\d{4,6}$/, "");
}

/**
 * Convert slug to clean human-readable display name.
 */
export function formatDisplayName(slug: string): string {
  const canonical = getCanonicalKey(slug);
  // Check if there is an Indonesian translation for the canonical English slug
  const words = canonical.split("-");
  const formatted = words
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
  return formatted;
}

/**
 * Classify an ARASAAC pictogram slug into 1..3 educational categories.
 */
export function classifySlug(slug: string): AssetCategory[] {
  const canonical = getCanonicalKey(slug).toLowerCase();

  // Pure numbers (2..100) or number-prefixed slugs like 2-4890, 10-29254
  if (/^\d+(-\d+)?$/.test(slug) || /^(one|two|three|four|five|six|seven|eight|nine|ten|thirty|nought)/.test(canonical)) {
    return ["Matematika"];
  }

  if (EXACT_CATEGORY_MAP[canonical]) {
    return EXACT_CATEGORY_MAP[canonical];
  }

  const cats = new Set<AssetCategory>();

  // Pattern-based classification
  if (/(soap|wash|rinse|dry|bath|shower|brush-teeth|toothpaste|lather|shave|comb|pee|toilet|sanitary|gargle|wipe-the-pee|sweaty|dirty|healthy|ill|hurt|infirmary|hospital|mata|telinga|hidung|mulut|tangan|kaki|gigi|kepala|rambut|leher|perut|jari|lidah)/.test(canonical)) {
    cats.add("Kesehatan dan Kebersihan");
  }
  if (/(happy|sad|angry|scared|frightened|confused|confuse|tired|shy|ashamed|anxious|worried|worry|nervous|surprised|bored|boring|calm|content|pleasant|fun|furious|downhearted|rejoice|dislike|hate|love|like|friendly|cocky|embarrass|jitters|tersenyum|tertawa)/.test(canonical)) {
    cats.add("Emosi dan Perilaku");
  }
  if (/(bus|car|train|bike|bicycle|airport|fly|sail|drive|ride|honk|refuel|escalator|ramp|wheelchair)/.test(canonical)) {
    cats.add("Transportasi");
  }
  if (/(school|classroom|study|read|write|draw|paint|cut|paste|file)/.test(canonical)) {
    cats.add("Benda di Sekolah");
  }
  if (/(eat|drink|hungry|thirsty|kitchen|dining|boil|fry|roast|stir|whisk|knead|sieve|food|knife-and-fork|fork|sweet|salty)/.test(canonical)) {
    cats.add("Makanan dan Minuman");
  }
  if (/(house|home|bedroom|dress|undress|clothing|unzip|unfasten|unbuckle|knock|hang|plug|unclog|lighted)/.test(canonical)) {
    cats.add("Benda di Rumah");
  }
  if (/(wait-in-a-line|celebrate|visit|invite|everybody|play|bermain|membantu)/.test(canonical)) {
    cats.add("Kegiatan Sosial");
  }
  if (/(swim|jump|run|walk|stand|sit|kneel|climb|gallop|slalom|ski|dismount)/.test(canonical)) {
    cats.add("Pendidikan Jasmani");
  }
  if (/(yesterday|today|tomorrow|before|after|now|always|never|morning|pagi|siang|malam)/.test(canonical)) {
    cats.add("Bahasa Indonesia");
  }
  if (/(wide|narrow|thick|thin|tall|short|long|fat|slim|full|empty|many|few|more|less|far|between|above|below|inside|outside|behind|in-front|around|left|straight)/.test(canonical)) {
    cats.add("Matematika");
  }
  if (/(fire|accident|break-glass|secure|stop|danger)/.test(canonical)) {
    cats.add("Keselamatan Diri");
  }

  if (cats.size === 0) {
    cats.add("Kehidupan Sehari-hari");
  }

  return [...cats].slice(0, 3);
}

/**
 * Enrich a pictogram slug with Indonesian & English keywords and concepts.
 */
export function enrichKeywords(slug: string, categories: AssetCategory[]): {
  keywords_id: string[];
  keywords_en: string[];
  concepts: string[];
  description: string;
} {
  const canonical = getCanonicalKey(slug).toLowerCase();
  const tokens = canonical.split("-").filter(Boolean);

  const kwId = new Set<string>();
  const kwEn = new Set<string>();
  const concepts = new Set<string>();

  // Add raw canonical phrase
  const phrase = tokens.join(" ");
  if (/^\d+$/.test(canonical)) {
    kwId.add(canonical);
    kwId.add(`angka ${canonical}`);
    kwId.add("bilangan");
    kwEn.add(canonical);
    kwEn.add(`number ${canonical}`);
    concepts.add("bilangan dan berhitung");
  } else {
    // Heuristic: if slug is in our Indonesian core list or looks Indonesian
    const trans = ID_EN_TRANSLATIONS[canonical];
    if (trans) {
      for (const t of trans) {
        if (/^[a-z\s-]+$/.test(t) && (t.includes(" ") ? false : true)) {
          // Put in both or appropriate bucket
        }
        kwId.add(t);
        kwEn.add(t);
      }
    }
    kwId.add(phrase);
    kwEn.add(phrase);
    for (const tok of tokens) {
      if (tok.length > 1) {
        kwId.add(tok);
        kwEn.add(tok);
        const tokTrans = ID_EN_TRANSLATIONS[tok];
        if (tokTrans) {
          for (const tt of tokTrans) {
            kwId.add(tt);
            kwEn.add(tt);
          }
        }
      }
    }
  }

  for (const cat of categories) {
    concepts.add(cat.toLowerCase());
  }

  const display = formatDisplayName(slug);
  const description = `Piktogram visual untuk konsep "${display}" pada kategori ${categories.join(", ")}.`;

  return {
    keywords_id: [...kwId],
    keywords_en: [...kwEn],
    concepts: [...concepts],
    description,
  };
}
