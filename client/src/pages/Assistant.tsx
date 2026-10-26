import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpLeft,
  BookOpen,
  Check,
  ChevronLeft,
  Copy,
  ExternalLink,
  GitCompareArrows,
  History,
  Moon,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import ProductCard from "@/components/ProductCard";
import { catalogProducts, type CatalogProduct } from "@/data/catalog";
import { resolveProductRefs, searchCatalog } from "@/lib/catalogSearch";
import {
  askN8nAssistant,
  type AssistantMessage,
  type AssistantProductRef,
} from "@/lib/n8nAssistant";

type Message = AssistantMessage & {
  id: string;
  retry?: string;
  productIds?: string[];
  suggestions?: string[];
};
type SavedChat = {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
};

type Theme = "light" | "dark";

const quickStarts = [
  {
    label: "اكتشف العود",
    detail: "خشب، دهن، ورقائق موثقة",
    icon: "ع",
    prompt: "أبغى أكتشف منتجات العود الموثقة",
  },
  {
    label: "ابحث عن عطر",
    detail: "روائح عطرية من الكتالوج",
    icon: "عط",
    prompt: "ابحث لي عن عطر من منتجات بدر",
  },
  {
    label: "هدية لمناسبة",
    detail: "خلّنا نرتبها بذوق",
    icon: "هـ",
    prompt: "أبغى هدية لمناسبة خاصة",
  },
  {
    label: "حسب الميزانية",
    detail: "خيارات واضحة بالسعر",
    icon: "ر",
    prompt: "اقترح لي منتجات أقل من 100 ريال",
  },
  {
    label: "قارن المنتجات",
    detail: "فرق واضح بدون تعقيد",
    icon: "م",
    prompt: "قارن لي بين منتجين من الكتالوج",
  },
  {
    label: "كل المنتجات",
    detail: "شاهد الـ 73 منتجًا",
    icon: "٧٣",
    prompt: "اعرض لي كل المنتجات الموثقة",
  },
];

const preferencePrompts = [
  "ميزانيتي أقل من 100 ريال",
  "أحب الروائح الدافئة والشرقية",
  "أبحث عن هدية رسمية",
  "أبغى شيء للاستخدام اليومي",
];

const welcome: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "يا هلا بك. أنا مساعد بدر أبا الخيل. خلّنا نرتب اختيارك بهدوء — أسأل عن احتياجك، وأعرض لك ما تؤكده بيانات المتجر الرسمي فقط.",
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatPrice(value: number | null) {
  return typeof value === "number"
    ? `${new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(value)} ر.س`
    : "غير متاح";
}

function renderRichText(text: string) {
  const urlPattern = /(https?:\/\/[^\s<]+)/g;
  return text.split(urlPattern).map((part, index) => {
    if (!/^https?:\/\//i.test(part))
      return <span key={`${part}-${index}`}>{part}</span>;
    const clean = part.replace(/[،؛.,)\]]+$/, "");
    const suffix = part.slice(clean.length);
    return (
      <span key={`${part}-${index}`}>
        <a
          className="reply-link"
          href={clean}
          target="_blank"
          rel="noopener noreferrer"
        >
          {clean}
          <ExternalLink size={12} />
        </a>
        {suffix}
      </span>
    );
  });
}

function followUps(query: string) {
  const source = query.toLocaleLowerCase("ar");
  if (source.includes("هدية"))
    return [
      "ما المنتجات المناسبة لميزانية 100 ريال؟",
      "أحب هدية عطرية رسمية",
      "قارن لي خيارين للهدايا",
    ];
  if (source.includes("ميزانية") || /\d{2,4}/.test(source))
    return [
      "قارن لي أرخص خيارين",
      "وش يناسب هدية؟",
      "اعرض كل المنتجات المتاحة",
    ];
  if (source.includes("عود"))
    return [
      "وش الفرق بين دهن العود والرقائق؟",
      "أبغى خيار يومي",
      "اعرض منتجات العود كاملة",
    ];
  return [
    "اكتشف المنتجات الموثقة",
    "ساعدني أختار هدية",
    "وش الأنواع الظاهرة في المتجر؟",
  ];
}

function comparisonRows(products: CatalogProduct[]) {
  return products.map(product => ({
    product,
    category: product.categories[0]?.name ?? "غير محدد",
    size: product.weight ? `${product.weight} كجم` : "غير متاح",
    status: product.outOfStock
      ? "نفدت الكمية"
      : product.available
        ? "متوفر حسب snapshot"
        : "تحتاج تحققًا",
  }));
}

function ComparisonTable({ products }: { products: CatalogProduct[] }) {
  if (products.length < 2) return null;
  return (
    <div className="comparison-card" dir="rtl">
      <div className="comparison-heading">
        <span>
          <GitCompareArrows size={17} /> مقارنة من الكتالوج
        </span>
        <small>{products.length} خيارات موثقة</small>
      </div>
      <div className="comparison-scroll">
        <table>
          <thead>
            <tr>
              <th>المنتج</th>
              <th>الفئة</th>
              <th>السعر</th>
              <th>الحجم</th>
              <th>التوفر</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows(products).map(
              ({ product, category, size, status }) => (
                <tr key={product.url}>
                  <td>
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img src={product.image} alt="" />
                      <strong>{product.name}</strong>
                      <ExternalLink size={12} />
                    </a>
                  </td>
                  <td>{category}</td>
                  <td className="comparison-price">
                    {formatPrice(product.price)}
                  </td>
                  <td>{size}</td>
                  <td>{status}</td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Assistant() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = sessionStorage.getItem("bader-assistant-messages");
      return saved ? (JSON.parse(saved) as Message[]) : [welcome];
    } catch {
      return [welcome];
    }
  });
  const [sessionKey, setSessionKey] = useState(
    () => sessionStorage.getItem("bader-assistant-session") ?? makeId()
  );
  const [savedChats, setSavedChats] = useState<SavedChat[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("bader-assistant-history") ?? "[]"
      ) as SavedChat[];
    } catch {
      return [];
    }
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("bader-assistant-theme") as Theme) || "light"
  );
  const [notice, setNotice] = useState("");
  const [isPending, setIsPending] = useState(false);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const hasStarted = messages.some(item => item.role === "user");
  const history = useMemo<AssistantMessage[]>(
    () => messages.slice(-10).map(({ role, content }) => ({ role, content })),
    [messages]
  );

  useEffect(() => {
    sessionStorage.setItem(
      "bader-assistant-messages",
      JSON.stringify(messages)
    );
    sessionStorage.setItem("bader-assistant-session", sessionKey);
    if (messages.some(item => item.role === "user")) {
      const firstUser = messages.find(item => item.role === "user");
      const next: SavedChat = {
        id: sessionKey,
        title: firstUser?.content.slice(0, 38) || "محادثة بدر",
        updatedAt: new Date().toISOString(),
        messages,
      };
      setSavedChats(current => {
        const updated = [
          next,
          ...current.filter(chat => chat.id !== sessionKey),
        ].slice(0, 12);
        localStorage.setItem(
          "bader-assistant-history",
          JSON.stringify(updated)
        );
        return updated;
      });
    }
  }, [messages, sessionKey]);

  useEffect(() => {
    localStorage.setItem("bader-assistant-theme", theme);
    document.documentElement.dataset.baderTheme = theme;
  }, [theme]);

  useEffect(() => {
    const node = chatWindowRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages, isPending]);

  const send = async (value = message) => {
    const trimmed = value.trim();
    if (!trimmed || isPending) return;
    setMessage("");
    setNotice("");
    const currentHistory = history;
    const userId = makeId();
    setMessages(current => [
      ...current,
      { id: userId, role: "user", content: trimmed },
    ]);
    setIsPending(true);
    try {
      const result = await askN8nAssistant({
        message: trimmed,
        sessionKey,
        history: currentHistory,
        catalog: catalogProducts.filter(product => product.available && !product.outOfStock),
      });
      const structured = resolveProductRefs(result.products);
      const localSearch = searchCatalog(trimmed);
      console.debug("[CatalogSearch]", localSearch.diagnostics);
      const attached = structured.length ? structured : localSearch.products;
      setMessages(current => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: result.reply,
          productIds: attached.map(product => product.url),
          suggestions: followUps(trimmed),
        },
      ]);
    } catch (error) {
      const code = error instanceof Error ? error.message : "assistant_failed";
      const content =
        code === "assistant_timeout"
          ? "تأخر الرد قليلًا. جرّب إعادة المحاولة، أو افتح المتجر الرسمي مباشرة."
          : code.includes("429")
            ? "المساعد مشغول حاليًا بسبب كثرة الطلبات. جرّب بعد قليل."
            : "تعذر الوصول إلى مساعد بدر حاليًا بسبب مشكلة مؤقتة. يمكنك إعادة المحاولة دون فقدان سؤالك.";
      const localSearch = searchCatalog(trimmed);
      console.debug("[CatalogSearch]", localSearch.diagnostics);
      const localMatches = localSearch.products;
      setMessages(current => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content,
          productIds: localMatches.map(product => product.url),
          retry: trimmed,
          suggestions: localMatches.length ? followUps(trimmed) : undefined,
        },
      ]);
    } finally {
      setIsPending(false);
    }
  };

  const newConversation = () => {
    setSessionKey(makeId());
    setMessages([welcome]);
    setMessage("");
    setNotice("بدأنا محادثة جديدة.");
    setHistoryOpen(false);
    sessionStorage.removeItem("bader-assistant-messages");
  };

  const loadConversation = (chat: SavedChat) => {
    setSessionKey(chat.id);
    setMessages(chat.messages);
    setHistoryOpen(false);
    setNotice("تم فتح المحادثة المحفوظة.");
  };

  const deleteConversation = (id: string) => {
    setSavedChats(current => {
      const updated = current.filter(chat => chat.id !== id);
      localStorage.setItem("bader-assistant-history", JSON.stringify(updated));
      return updated;
    });
  };

  const copyReply = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setNotice("تم نسخ الرد.");
    } catch {
      setNotice("لم يتم النسخ من هذا المتصفح.");
    }
  };

  const productMap = useMemo(
    () => new Map(catalogProducts.map(product => [product.url, product])),
    []
  );
  return (
    <AppShell active="assistant" title="المساعد">
      <section
        className={`assistant-page assistant-immersive assistant-theme-${theme}`}
      >
        <div className="assistant-ambient" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="assistant-workspace">
          <header className="immersive-head">
            <div className="immersive-identity">
              <span className="immersive-avatar">
                <img
                  src="/baderai/brand/bader-sign.jpg"
                  alt="شعار بدر أبا الخيل"
                />
              </span>
              <div>
                <span className="identity-kicker">مساعد بدر أبا الخيل</span>
                <strong>اسأل، واختَر على مهل.</strong>
                <small>
                  <i /> متصل بالمصدر الرسمي عبر n8n
                </small>
              </div>
            </div>
            <div className="immersive-actions">
              <button
                className="head-icon-button"
                onClick={() =>
                  setTheme(current => (current === "light" ? "dark" : "light"))
                }
                aria-label={
                  theme === "light"
                    ? "تفعيل الوضع الداكن"
                    : "تفعيل الوضع الفاتح"
                }
              >
                {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
              </button>
              <button
                className="head-action"
                onClick={() => setHistoryOpen(true)}
              >
                <History size={16} /> <span>السجل</span>
              </button>
              <button
                className="head-action head-action-primary"
                onClick={newConversation}
              >
                <Plus size={16} /> <span>محادثة جديدة</span>
              </button>
            </div>
          </header>

          {historyOpen && (
            <div
              className="history-layer"
              role="dialog"
              aria-modal="true"
              aria-label="سجل المحادثات"
            >
              <div className="history-panel">
                <div className="history-panel-head">
                  <div>
                    <span className="section-kicker">ذاكرة محلية</span>
                    <h2>محادثاتك مع بدر</h2>
                  </div>
                  <button
                    className="head-icon-button"
                    onClick={() => setHistoryOpen(false)}
                    aria-label="إغلاق سجل المحادثات"
                  >
                    <X size={17} />
                  </button>
                </div>
                {savedChats.length ? (
                  <div className="history-list">
                    {savedChats.map(chat => (
                      <div className="history-item" key={chat.id}>
                        <button onClick={() => loadConversation(chat)}>
                          <strong>{chat.title}</strong>
                          <small>
                            {new Date(chat.updatedAt).toLocaleDateString(
                              "ar-SA"
                            )}
                          </small>
                        </button>
                        <button
                          className="history-delete"
                          onClick={() => deleteConversation(chat.id)}
                          aria-label={`حذف ${chat.title}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="history-empty">
                    <History size={22} />
                    <p>لا توجد محادثات محفوظة بعد.</p>
                    <small>يظهر سجل المحادثة هنا بعد إرسال أول سؤال.</small>
                  </div>
                )}
                <button className="history-new" onClick={newConversation}>
                  <Plus size={15} /> محادثة جديدة
                </button>
              </div>
            </div>
          )}

          <div
            className={`conversation-stage ${hasStarted ? "has-messages" : "is-empty"}`}
          >
            {!hasStarted ? (
              <div className="conversation-welcome">
                <div className="welcome-seal">
                  <ShieldCheck size={19} />
                  <span>مصدر رسمي</span>
                  <small>المعلومة أولًا</small>
                </div>
                <span className="section-kicker">
                  <span className="kicker-line" /> مساحة اختيارك
                </span>
                <h1>
                  أهلًا بك في
                  <br />
                  <em>مساعد بدر.</em>
                </h1>
                <p>
                  من أول سؤال إلى المنتج المناسب، أساعدك على اكتشاف ما تؤكده
                  بيانات متجر بدر الرسمي — بلغة واضحة وذوق هادئ.
                </p>
                <div className="welcome-proof">
                  <span>
                    <Check size={14} /> 73 منتجًا موثقًا
                  </span>
                  <span>
                    <Check size={14} /> روابط الشراء الرسمية
                  </span>
                  <span>
                    <Check size={14} /> لا تخمين في الأسعار
                  </span>
                </div>
              </div>
            ) : (
              <div
                className="chat-window-immersive"
                ref={chatWindowRef}
                aria-live="polite"
              >
                {messages.map((item, index) => {
                  const products = item.productIds
                    ?.map(id => productMap.get(id))
                    .filter(Boolean) as CatalogProduct[] | undefined;
                  const compare =
                    item.role === "assistant" &&
                    item.productIds &&
                    (messages[index - 1]?.content.includes("قارن") ||
                      messages[index - 1]?.content.includes("مقارن"));
                  return (
                    <div className={`message-block ${item.role}`} key={item.id}>
                      <div className="message-label">
                        <span className="message-person">
                          <span className="message-dot" />
                          {item.role === "assistant" ? "مساعد بدر" : "أنت"}
                        </span>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                      </div>
                      <div className="message-bubble">
                        {renderRichText(item.content)}
                      </div>
                      {products && products.length > 0 && (
                        <div className="assistant-product-deck">
                          {products.map(product => (
                            <ProductCard key={product.url} product={product} />
                          ))}
                        </div>
                      )}
                      {compare && products && (
                        <ComparisonTable products={products} />
                      )}
                      {item.role === "assistant" && item.id !== "welcome" && (
                        <div className="message-tools">
                          <button onClick={() => void copyReply(item.content)}>
                            <Copy size={13} /> نسخ الرد
                          </button>
                          {item.retry && (
                            <button onClick={() => void send(item.retry)}>
                              <RotateCcw size={13} /> إعادة المحاولة
                            </button>
                          )}
                        </div>
                      )}
                      {item.role === "assistant" && item.suggestions && (
                        <div className="follow-up-chips">
                          {item.suggestions.map(suggestion => (
                            <button
                              key={suggestion}
                              onClick={() => void send(suggestion)}
                              disabled={isPending}
                            >
                              {suggestion}
                              <ChevronLeft size={14} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {isPending && (
                  <div className="message-block assistant">
                    <div className="message-label">
                      <span className="message-person">
                        <span className="message-dot" />
                        مساعد بدر
                      </span>
                      <span>…</span>
                    </div>
                    <div className="message-bubble typing-bubble">
                      <span className="typing-orbit">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span>أرتّب لك المعلومة من المصدر الرسمي…</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!hasStarted && (
              <div className="quick-starts">
                <div className="quick-starts-head">
                  <div>
                    <span className="section-kicker">ابدأ من هنا</span>
                    <h2>وش يدور في بالك؟</h2>
                  </div>
                  <span className="quick-count">اختيارات مقترحة</span>
                </div>
                <div className="quick-start-grid">
                  {quickStarts.map(item => (
                    <button
                      key={item.label}
                      className="quick-start-card"
                      onClick={() => void send(item.prompt)}
                      disabled={isPending}
                    >
                      <span className="quick-icon">{item.icon}</span>
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.detail}</small>
                      </span>
                      <ArrowUpLeft size={16} />
                    </button>
                  ))}
                </div>
                <div className="preference-strip">
                  <span>أو قل لي تفضيلك:</span>
                  {preferencePrompts.map(prompt => (
                    <button key={prompt} onClick={() => void send(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="composer-zone">
            <form
              className="immersive-composer"
              onSubmit={event => {
                event.preventDefault();
                void send();
              }}
            >
              <div className="composer-leading">
                <Sparkles size={17} />
                <span>اسأل مساعد بدر</span>
              </div>
              <input
                value={message}
                onChange={event => setMessage(event.target.value)}
                placeholder="اكتب سؤالك عن منتج، مناسبة، أو ميزانية..."
                aria-label="رسالتك إلى مساعد بدر"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={isPending || !message.trim()}
                aria-label="إرسال الرسالة"
              >
                <Send size={17} />
                <span>إرسال</span>
              </button>
            </form>
            <div className="composer-foot">
              <span>
                <ShieldCheck size={14} /> إجابات مرتبطة ببيانات المتجر الرسمية
              </span>
              <a href="#/store">
                تصفح الكتالوج <ArrowUpLeft size={13} />
              </a>
            </div>
            {notice && (
              <div className="human-notice">
                <Check size={14} /> {notice}
              </div>
            )}
          </div>
        </div>
        <footer className="immersive-foot">
          <span>
            <BookOpen size={14} /> لا نعرض تفاصيل منتج إلا من مصدر معتمد
          </span>
          <span>© بدر أبا الخيل للعود والعطور</span>
          <a
            href="https://baderabalkhail.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            زيارة متجر بدر <ExternalLink size={13} />
          </a>
        </footer>
      </section>
    </AppShell>
  );
}
