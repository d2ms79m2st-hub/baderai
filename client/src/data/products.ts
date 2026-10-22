export type VerifiedProduct = {
  name: string;
  price: number;
  compareAt?: number;
  image: string;
  url: string;
  description: string;
  availability: "متوفر" | "نفدت الكمية";
  checkedAt: string;
};

export const verifiedProducts: VerifiedProduct[] = [
  {
    name: "نجد 75 ملي",
    price: 135,
    compareAt: 150,
    image: "https://cdn.salla.sa/AzeRxp/08e30991-56d3-41de-ac2c-b4e934c750b1-1000x999.07149489322-51ZEPQSxmD2H1yeWMQ1ftFejxUHnD0nw6QLs75GJ.png",
    url: "https://baderabalkhail.com/نجد-75-ملي/p1574729488",
    description: "عطر عشبي حار بنفحات الريحان ونجيل الهند والفلفل الأسود والباتشولي.",
    availability: "نفدت الكمية",
    checkedAt: "2026-10-22",
  },
  {
    name: "WOODY 75 ملي",
    price: 135,
    compareAt: 150,
    image: "https://cdn.salla.sa/AzeRxp/813940e5-36aa-409f-843a-07d74fa21902-1000x999.07149489322-4YJL9IB3dWEfD9f1sMRxBdfsFZKcUR8LjheV7LFL.png",
    url: "https://baderabalkhail.com/woody-75-ملي/p1579430015",
    description: "عطر فاكهي زهري دافئ بنفحات الكمثرى والبرغموت والماندرين والزنجبيل.",
    availability: "نفدت الكمية",
    checkedAt: "2026-10-22",
  },
  {
    name: "مروكي محسن حجم صغير",
    price: 68,
    compareAt: 85,
    image: "https://cdn.salla.sa/AzeRxp/344b9cc3-5547-4646-bb70-d605aaf8c835-1000x999.07149489322-9BPhiUUVZZNUik0aSkEkHB2QEQGqyxKDEpOfCqGA.png",
    url: "https://baderabalkhail.com/مروكي-محسن-حجم-صغير/p982377704",
    description: "منتج مروكي محسن بالحجم الصغير كما يظهر في صفحة المنتج الرسمية.",
    availability: "نفدت الكمية",
    checkedAt: "2026-10-22",
  },
];
