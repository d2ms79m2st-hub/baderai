# GitHub Pages

يتم نشر واجهة React/Vite تلقائيًا من `.github/workflows/pages.yml` إلى `https://d2ms79m2st-hub.github.io/baderai/` عند كل push على `main`.

يستخدم البناء `GITHUB_ACTIONS=true` لضبط Vite base على `/baderai/`، ويستخدم Wouter Hash routing حتى تعمل الصفحات من دون خادم SPA. الروابط الداخلية تكون بصيغة `#/assistant` و`#/store` و`#/knowledge`.

هذه نسخة واجهة ثابتة: الصور والبطاقات والروابط الخارجية تعمل، بينما API الخادم وقاعدة البيانات وn8n تحتاج خدمة backend منفصلة ولا تُشحن داخل GitHub Pages أو داخل المتصفح.
