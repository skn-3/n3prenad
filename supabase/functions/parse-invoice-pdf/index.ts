import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const TOOL = {
  type: "function",
  function: {
    name: "extract_invoice",
    description: "Extract structured data from a SmartKlimat N3prenad invoice PDF.",
    parameters: {
      type: "object",
      properties: {
        invoice_number: { type: "string", description: "e.g. GVMO-020, SAMY-029, AS053" },
        date: { type: "string", description: "YYYY-MM-DD" },
        customer_address: { type: "string" },
        recipient_company: { type: "string" },
        recipient_org_nr: { type: "string" },
        total_amount: { type: "number" },
        moms: { type: "number" },
        team_prefix: { type: "string", description: "GVMO, SAMY, NBD, AS, JERK extracted from invoice number" },
        line_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              unit_price: { type: "number" },
              quantity: { type: "number" },
              sum: { type: "number" },
            },
            required: ["name", "unit_price", "quantity", "sum"],
            additionalProperties: false,
          },
        },
      },
      required: [
        "invoice_number", "date", "customer_address", "recipient_company",
        "recipient_org_nr", "total_amount", "moms", "team_prefix", "line_items",
      ],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { pdf_base64 } = await req.json();
    if (!pdf_base64) {
      return new Response(JSON.stringify({ error: "pdf_base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert at extracting structured data from Swedish construction invoices (SmartKlimat N3prenad). Always call the extract_invoice tool with the data you find. Use numeric values without spaces or currency symbols. Map team_prefix from the invoice number prefix (GVMO, SAMY, NBD, AS, JERK).",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrahera all data från denna SmartKlimat N3prenad faktura-PDF. Returnera strukturerad data via verktyget." },
              { type: "file", file: { filename: "invoice.pdf", file_data: `data:application/pdf;base64,${pdf_base64}` } },
            ],
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "extract_invoice" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit nådd, försök igen om en stund." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI-kredit slut. Lägg till krediter i Lovable AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway-fel" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiJson));
      return new Response(JSON.stringify({ error: "AI returnerade ingen strukturerad data" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-invoice-pdf error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});