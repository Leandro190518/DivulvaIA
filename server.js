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

    const prompt = `
Você é o assistente de marketing do DivulvaIA.

Crie uma campanha de divulgação em português do Brasil para um pequeno negócio.

Dados do negócio:
Nome: ${businessName || ""}
Produto/serviço: ${product || ""}
Oferta/preço: ${offer || ""}
WhatsApp: ${whatsapp || ""}
Instagram: ${instagram || ""}
Região: ${region || ""}
Objetivo: ${objective || ""}
Detalhes: ${details || ""}

Gere conteúdo separado para:

1. WHATSAPP
2. INSTAGRAM
3. STORIES
4. REELS
5. CALENDÁRIO DE 7 DIAS

O texto deve ser comercial, natural, atrativo e fácil de copiar.
Não invente informações que não foram fornecidas.
Use chamadas para ação.
Inclua WhatsApp e Instagram quando fornecidos.
`;

    const response = await client.responses.create({
      model: "gpt-6-luna",
      input: prompt,
    });

    res.json({
      success: true,
      result: response.output_text,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Não foi possível gerar a campanha.",
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`DivulvaIA rodando na porta ${port}`);
});
