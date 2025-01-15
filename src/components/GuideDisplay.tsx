const formatGuideContent = (content: string) => {
  return content
    .split('\n\n')
    .map((section, index) => {
      // Handle section headers
      if (section.startsWith('##')) {
        return (
          <h3 key={index} className="text-2xl font-bold text-purple-400 mb-4">
            {section.replace('##', '').trim()}
          </h3>
        );
      }
      
      // Handle bullet points
      if (section.includes('•')) {
        const items = section.split('\n').filter(item => item.trim());
        return (
          <ul key={index} className="list-none space-y-3 pl-4 mb-6">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-300">
                <span className="text-purple-400 mt-1">•</span>
                <span className="flex-1">{item.replace('•', '').trim()}</span>
              </li>
            ))}
          </ul>
        );
      }
      
      // Regular paragraphs
      return (
        <p key={index} className="text-base text-gray-300 leading-relaxed mb-4">
          {section}
        </p>
      );
    });
}; 