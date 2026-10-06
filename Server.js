const express = require("express");
const OpenAI = require("openai");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/campaign", async (req, res) => {
  try {
    const {
      businessName,
      product,
      offer,
      whatsapp,
      instagram,
      region,
      objective,
      details,
    } = req.body;

    if (!businessName || !product) {
      return res.status(400).json({
        success: false,
        error: "Informe pelo menos o nome do negócio e o produto/serviço.",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "A chave da OpenAI ainda não foi configurada no servidor.",
      });
    }

    const prompt = `
Você é o assistente de marketing do DivulgaIA.

Crie uma campanha completa de divulgação em português do Brasil para um pequeno negócio.

DADOS DO NEGÓCIO:
Nome: ${businessName || ""}
Produto/serviço: ${product || ""}
Oferta/preço: ${offer || ""}
WhatsApp: ${whatsapp || ""}
Instagram: ${instagram || ""}
Região: ${region || ""}
Objetivo: ${objective || ""}
Detalhes: ${details || ""}

IMPORTANTE:
- Não invente informações.
- Use somente os dados fornecidos.
- Escreva de forma comercial, natural e atrativa.
- Crie chamadas para ação.
- Inclua WhatsApp e Instagram quando fornecidos.
- Entregue o resultado EXATAMENTE nos cinco blocos abaixo.
- Não coloque explicações antes ou depois dos blocos.

=== WHATSAPP ===
Crie uma mensagem pronta para enviar pelo WhatsApp.

=== INSTAGRAM ===
Crie uma legenda completa para publicação no Instagram.
Inclua uma chamada para ação e hashtags relevantes.

=== STORIES ===
Crie uma sequência de 5 Stories.
Cada Story deve ter uma frase curta e objetiva.

=== REELS ===
Crie um roteiro curto para Reels.
Inclua:
- Gancho inicial
- Texto/cenas
- Chamada para ação

=== CALENDÁRIO 7 DIAS ===
Crie um calendário de divulgação para 7 dias.
Para cada dia, informe:
- Dia
- Tipo de conteúdo
- O que publicar
- Objetivo
`;

    const response = await client.responses.create({
      model: "gpt-6-luna",
      input: prompt,
      max_output_tokens: 2500,
    });

    const texto = response.output_text || "";

    if (!texto) {
      return res.status(502).json({
        success: false,
        error: "A IA não retornou conteúdo.",
      });
    }

    const whatsappText = extrairBloco(
      texto,
      "=== WHATSAPP ===",
      "=== INSTAGRAM ==="
    );

    const instagramText = extrairBloco(
      texto,
      "=== INSTAGRAM ===",
      "=== STORIES ==="
    );

    const storiesText = extrairBloco(
      texto,
      "=== STORIES ===",
      "=== REELS ==="
    );

    const reelsText = extrairBloco(
      texto,
      "=== REELS ===",
      "=== CALENDÁRIO 7 DIAS ==="
    );

    const calendarioText = extrairBloco(
      texto,
      "=== CALENDÁRIO 7 DIAS ===",
      null
    );

    res.json({
      success: true,
      whatsapp: whatsappText,
      instagram: instagramText,
      stories: storiesText,
      reels: reelsText,
      calendario: calendarioText,
      result: texto,
    });

  } catch (error) {
    console.error("ERRO OPENAI:", error);

    const code = error?.code || error?.error?.code || "";
    const status = error?.status || error?.statusCode || 500;
    const message = error?.message || "";

    if (
      code === "credit_balance_exhausted" ||
      code === "insufficient_quota" ||
      /no credits remaining|credit balance|insufficient quota|quota/i.test(message)
    ) {
      return res.status(402).json({
        success: false,
        error:
          "A API da OpenAI está sem créditos no momento. O site e o login estão funcionando normalmente; a geração por IA será liberada quando houver créditos na API.",
        code: "credit_balance_exhausted",
      });
    }

    if (status === 401) {
      return res.status(500).json({
        success: false,
        error:
          "A chave da OpenAI no servidor não foi aceita. Verifique a variável OPENAI_API_KEY no Render.",
        code: "openai_auth_error",
      });
    }

    if (status === 429) {
      return res.status(429).json({
        success: false,
        error:
          "A API da OpenAI atingiu um limite de uso ou crédito. Tente novamente depois de corrigir o limite indicado pela API.",
        code: "openai_rate_or_quota_error",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Não foi possível gerar a campanha pela IA neste momento.",
      code: "openai_unknown_error",
    });
  }
});

function extrairBloco(texto, inicio, fim) {
  const inicioIndex = texto.indexOf(inicio);

  if (inicioIndex === -1) {
    return "";
  }

  const inicioConteudo = inicioIndex + inicio.length;

  const fimIndex = fim
    ? texto.indexOf(fim, inicioConteudo)
    : texto.length;

  return texto
    .substring(
      inicioConteudo,
      fimIndex === -1 ? texto.length : fimIndex
    )
    .trim();
}

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`DivulvaIA rodando na porta ${port}`);
});
