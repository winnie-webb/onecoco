import { brand } from "@/lib/brand";

/** Email and (when configured) WhatsApp, as tappable links. */
export function ContactLinks({ className = "" }: { className?: string }) {
  return (
    <ul className={className}>
      {brand.contact.whatsapp && (
        <li>
          WhatsApp: <a href={`https://wa.me/${brand.contact.whatsapp}`}>+{brand.contact.whatsapp}</a>
        </li>
      )}
      <li>
        Email: <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>
      </li>
    </ul>
  );
}
