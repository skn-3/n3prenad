const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

function cleanBase64(b64: string): string {
  if (!b64) return ''
  let cleaned = b64.trim()
  if (cleaned.includes(',') && cleaned.startsWith('data:')) {
    cleaned = cleaned.split(',')[1]
  }
  return cleaned.replace(/\s/g, '')
}

function respond(ok: boolean, payload: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ ok, ...payload }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) return respond(false, { error: 'LOVABLE_API_KEY is not configured' })

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) return respond(false, { error: 'RESEND_API_KEY is not configured' })

    const {
      recipientEmail,
      recipientName,
      orderNumber,
      customerAddress,
      customerName,
      customerPhone,
      description,
      pdfBase64,
      imageAttachments,
    } = await req.json()

    if (!recipientEmail || !orderNumber || !customerAddress) {
      return respond(false, { error: 'Saknar obligatoriska fält (e-post, ordernummer, adress)' })
    }

    const subject = `A-ORDER ${orderNumber} — ${customerAddress}`

    const htmlBody = `
<h2 style="color: #22C55E; margin-bottom: 4px;">A-ORDER ${orderNumber}</h2>
<p style="font-size: 18px; margin-top: 0;"><strong>${customerAddress}</strong></p>
<hr style="border: none; border-top: 1px solid #ddd; margin: 16px 0;" />
<p><strong>Kund:</strong> ${customerName || '—'}<br/><strong>Telefon:</strong> ${customerPhone || '—'}</p>
${description ? `<p><strong>Beskrivning:</strong><br/>${description.replace(/\n/g, '<br/>')}</p>` : ''}
<hr style="border: none; border-top: 1px solid #ddd; margin: 16px 0;" />
<p style="color: #888; font-size: 13px;">PDF och eventuella bilder bifogas.<br/>Mvh<br/>SmartKlimat N3prenad</p>
    `

    const attachments: { filename: string; content: string }[] = []

    if (pdfBase64) {
      attachments.push({
        filename: `A-ORDER-${orderNumber}-${customerAddress.replace(/\s+/g, '_')}.pdf`,
        content: cleanBase64(pdfBase64),
      })
    }

    if (imageAttachments && Array.isArray(imageAttachments)) {
      imageAttachments.forEach((img: { filename: string; content: string }, i: number) => {
        attachments.push({
          filename: img.filename || `bild-${i + 1}.jpg`,
          content: cleanBase64(img.content),
        })
      })
    }

    console.log(`Sending email to ${recipientEmail}, ${attachments.length} attachments`)

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: 'SmartKlimat N3prenad <n3prenad@smartklimat.org>',
        reply_to: 'n3prenad@smartklimat.org',
        to: [recipientEmail],
        subject,
        html: htmlBody,
        attachments,
      }),
    })

    const data = await response.json()
    console.log(`Resend response [${response.status}]:`, JSON.stringify(data))

    if (!response.ok) {
      const msg = data?.message || data?.error || JSON.stringify(data)
      return respond(false, {
        error: `Resend-fel (${response.status}): ${msg}`,
        resendStatus: response.status,
        resendBody: data,
      })
    }

    return respond(true, { id: data.id })
  } catch (error: unknown) {
    console.error('Edge function error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Okänt fel'
    return respond(false, { error: errorMessage })
  }
})
