import { corsHeaders } from '@supabase/supabase-js/cors'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured')

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured')

    const {
      recipientEmail,
      recipientName,
      orderNumber,
      customerAddress,
      description,
      pdfBase64,
      imageAttachments,
    } = await req.json()

    if (!recipientEmail || !orderNumber || !customerAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const subject = `A-ORDER ${orderNumber} — ${customerAddress}`

    const htmlBody = `
      <p>Hej ${recipientName || 'montör'},</p>
      <p>Här kommer arbetsorder <strong>${orderNumber}</strong> för <strong>${customerAddress}</strong>.</p>
      ${description ? `<p><strong>Beskrivning:</strong><br/>${description.replace(/\n/g, '<br/>')}</p>` : ''}
      <p>PDF och eventuella bilder bifogas.</p>
      <br/>
      <p>Mvh<br/>SmartKlimat N3prenad</p>
    `

    const attachments: { filename: string; content: string }[] = []

    if (pdfBase64) {
      attachments.push({
        filename: `A-ORDER-${orderNumber}-${customerAddress.replace(/\s+/g, '_')}.pdf`,
        content: pdfBase64,
      })
    }

    if (imageAttachments && Array.isArray(imageAttachments)) {
      imageAttachments.forEach((img: { filename: string; content: string }, i: number) => {
        attachments.push({
          filename: img.filename || `bild-${i + 1}.jpg`,
          content: img.content,
        })
      })
    }

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: 'SmartKlimat N3prenad <onboarding@resend.dev>',
        to: [recipientEmail],
        subject,
        html: htmlBody,
        attachments,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', JSON.stringify(data))
      throw new Error(`Resend API error [${response.status}]: ${JSON.stringify(data)}`)
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('Error sending order email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
