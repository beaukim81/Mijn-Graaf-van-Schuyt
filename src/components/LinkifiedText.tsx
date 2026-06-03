interface LinkifiedTextProps {
  text: string;
}

const urlPattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
const urlOnlyPattern = /^(https?:\/\/[^\s<]+|www\.[^\s<]+)$/i;
const trailingPunctuation = /[),.;:!?]+$/;

function cleanUrl(rawUrl: string) {
  const trailing = rawUrl.match(trailingPunctuation)?.[0] ?? "";
  const url = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;
  const href = url.startsWith("www.") ? `https://${url}` : url;
  return { href, trailing, url };
}

export function LinkifiedText({ text }: LinkifiedTextProps) {
  const parts = text.split(urlPattern);

  return (
    <>
      {parts.map((part, index) => {
        if (!urlOnlyPattern.test(part)) return part;
        const { href, trailing, url } = cleanUrl(part);
        return (
          <span key={`${part}-${index}`}>
            <a href={href} target="_blank" rel="noreferrer">
              {url}
            </a>
            {trailing}
          </span>
        );
      })}
    </>
  );
}
