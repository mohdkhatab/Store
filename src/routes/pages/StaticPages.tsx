import { Mail, MessageCircle } from 'lucide-react'
import { Container } from '@/components/layout/PublicLayout'
import { Card } from '@/components/ui/Card'
import { useStoreSettings } from '@/features/catalog/queries'
import { supportWhatsappLink } from '@/lib/contact'

function Prose({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Container className="py-10">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{title}</h1>
      <Card className="mt-6 max-w-3xl">
        <div className="space-y-5 text-sm leading-relaxed text-[var(--text-secondary)] [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-[var(--text-primary)] [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </div>
      </Card>
    </Container>
  )
}

export function ContactPage() {
  const { data: settings } = useStoreSettings()

  return (
    <Container className="py-10">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Get in touch</h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--text-muted)]">
        Questions before buying, or trouble with an order you already placed? Message us — a real
        person answers.
      </p>

      <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
        {settings?.whatsapp_number && (
          <a
            href={supportWhatsappLink(settings.whatsapp_number)}
            target="_blank"
            rel="noreferrer noopener"
            className="glass-flat group p-5 transition-transform hover:-translate-y-1 motion-reduce:hover:translate-y-0"
          >
            <div className="grid size-10 place-items-center rounded-xl neu-well">
              <MessageCircle className="size-5 text-[var(--success)]" aria-hidden />
            </div>
            <h2 className="mt-3 font-semibold">WhatsApp</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Fastest way to reach us. Usually replies within a few hours.
            </p>
            <p className="tnum mt-2 text-sm font-medium">+{settings.whatsapp_number}</p>
          </a>
        )}

        {settings?.support_email && (
          <a
            href={`mailto:${settings.support_email}`}
            className="glass-flat group p-5 transition-transform hover:-translate-y-1 motion-reduce:hover:translate-y-0"
          >
            <div className="grid size-10 place-items-center rounded-xl neu-well">
              <Mail className="size-5 text-[var(--info)]" aria-hidden />
            </div>
            <h2 className="mt-3 font-semibold">Email</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Best for detailed questions or attachments.
            </p>
            <p className="mt-2 break-all text-sm font-medium">{settings.support_email}</p>
          </a>
        )}
      </div>

      <Card className="mt-6 max-w-3xl">
        <h2 className="font-semibold">Before you message about an order</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Please include your order number (it looks like <code className="tnum">UX-2026-0042</code>
          ). You will find it under <strong>My orders</strong>. It lets us find your payment
          immediately instead of asking you for details.
        </p>
      </Card>
    </Container>
  )
}

export function TermsPage() {
  return (
    <Prose title="Terms of service">
      <p>
        By buying from this store you agree to the terms below. Please read them before placing an
        order.
      </p>

      <h2>What you are buying</h2>
      <p>
        Every product on this site is digital source code. You receive the files themselves — there
        is no physical shipment and no hosted download page. Files are sent to you directly over
        WhatsApp or email after your payment is confirmed.
      </p>

      <h2>Licence</h2>
      <ul>
        <li>You may use a purchased product for your own projects or for a client project.</li>
        <li>You may modify the source code freely.</li>
        <li>
          You may not resell, redistribute, or publish the source code as your own product, in whole
          or in part.
        </li>
      </ul>

      <h2>Delivery</h2>
      <p>
        Orders are delivered by hand, normally within a few hours of confirmed payment. Delivery
        depends on the contact details you enter at checkout being correct. If your WhatsApp number
        or email address is wrong, tell us as soon as possible.
      </p>

      <h2>Support</h2>
      <p>
        Reasonable installation help is included. Custom development, hosting, and modifications
        beyond the product as described are not included and may be quoted separately.
      </p>

      <h2>Accounts</h2>
      <p>
        You are responsible for keeping your account password secure. Tell us immediately if you
        believe someone else has access to your account.
      </p>
    </Prose>
  )
}

export function PrivacyPage() {
  return (
    <Prose title="Privacy policy">
      <p>This store collects the minimum information needed to sell you a product and deliver it.</p>

      <h2>What we collect</h2>
      <ul>
        <li>Your name, email address and WhatsApp number, so we can deliver your order.</li>
        <li>Your order history and payment status.</li>
        <li>Any note you choose to add to an order.</li>
      </ul>

      <h2>What we do not collect</h2>
      <p>
        We never see or store your card number, UPI PIN, or bank credentials. Payment is handled
        entirely by the payment gateway; this site only learns whether a payment succeeded.
      </p>

      <h2>How we use it</h2>
      <p>
        Your contact details are used to deliver your order and to answer support questions about
        it. We do not sell your data, and we do not send marketing messages you did not ask for.
      </p>

      <h2>Where it is stored</h2>
      <p>
        Order and account data is stored in a managed Postgres database. Access is restricted so
        that you can only ever read your own orders.
      </p>

      <h2>Your choices</h2>
      <p>
        You can update your name and WhatsApp number from your profile at any time. To have your
        account and order history deleted, contact us — note that we may need to retain basic
        transaction records for accounting purposes.
      </p>
    </Prose>
  )
}

export function RefundPolicyPage() {
  return (
    <Prose title="Refund and cancellation policy">
      <p>
        Digital source code cannot be returned once it has been sent, so please read this before
        buying.
      </p>

      <h2>Before delivery</h2>
      <p>
        If you have paid but the files have not been sent to you yet, you can cancel for a full
        refund. Contact us with your order number.
      </p>

      <h2>After delivery</h2>
      <p>
        Once the source code has been delivered, the sale is final and we cannot offer a refund —
        you already have the files. This is standard for digital goods.
      </p>

      <h2>Exceptions</h2>
      <p>We will refund you in full if:</p>
      <ul>
        <li>You were charged twice for the same order.</li>
        <li>Payment was taken but we could not deliver the product.</li>
        <li>
          The product is substantially different from its description on this site, and we cannot
          fix it.
        </li>
      </ul>

      <h2>Not covered</h2>
      <ul>
        <li>Changing your mind after receiving the files.</li>
        <li>The product not fitting a requirement that was not described on the product page.</li>
        <li>Your hosting or server not meeting the product's stated requirements.</li>
      </ul>
      <p>
        If you are unsure whether a product suits your setup, message us <em>before</em> buying and
        we will tell you honestly.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Message us on WhatsApp or email with your order number and what went wrong. Approved refunds
        are returned to the original payment method, normally within 5–7 working days.
      </p>
    </Prose>
  )
}
