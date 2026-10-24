import { useEffect } from "react";

export default function PageMeta({ title, description }) {
  useEffect(() => {
    const previousTitle = document.title;
    const descriptionTag = document.querySelector('meta[name="description"]');
    const previousDescription = descriptionTag?.content;
    const socialTags = [
      [document.querySelector('meta[property="og:title"]'), title],
      [document.querySelector('meta[property="og:description"]'), description],
    ];
    const previousSocialValues = socialTags.map(([tag]) => tag?.content);

    document.title = title;
    descriptionTag?.setAttribute("content", description);
    socialTags.forEach(([tag, content]) =>
      tag?.setAttribute("content", content)
    );

    return () => {
      document.title = previousTitle;
      if (descriptionTag && previousDescription !== undefined) {
        descriptionTag.setAttribute("content", previousDescription);
      }
      socialTags.forEach(([tag], index) => {
        if (tag && previousSocialValues[index] !== undefined) {
          tag.setAttribute("content", previousSocialValues[index]);
        }
      });
    };
  }, [description, title]);

  return null;
}
