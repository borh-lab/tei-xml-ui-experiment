Creating and Validating TEI XML for Novels: A Definitive Guide1. Introduction: The Interpretive Act of EncodingThe creation of a digital edition of a novel using the Text Encoding Initiative (TEI) Guidelines is a task that transcends mere data entry or digitization. It is a fundamental act of textual criticism, a scholarly endeavor that requires the editor to make explicit the often implicit structures, semantics, and material conditions of a literary work. When a scholar or archivist approaches a novel—whether it is a sprawling Victorian "triple-decker," a fragmented modernist stream-of-consciousness text, or a contemporary born-digital narrative—they are confronted with a complex hierarchy of content objects. These objects, ranging from the gross structure of volumes and chapters to the granular semantics of dialogue and narrative voice, must be mapped onto the ordered, hierarchical tree structure of Extensible Markup Language (XML).This report provides an exhaustive, expert-level analysis of the methodologies, standards, and best practices for creating and validating TEI P5 XML for prose fiction. It addresses the dual requirements of structural fidelity—preserving the division of the text into volumes, parts, chapters, and paragraphs—and semantic depth—capturing the nuances of direct speech, character interaction, and narrative focalization. Furthermore, it explores the critical role of the TEI Header in establishing the digital text as a citable, sustainable scholarly resource, and delineates the technical workflows for schema customization (ODD) and validation that ensure interoperability and long-term preservation.1.1 The Philosophy of Markup in Prose FictionMarkup is arguably an interpretive act. As noted in the documentation of the Women Writers Project, encoding transforms a source text into data, a process that is "analytical, strategic, and interpretive". The resulting data reflects the disciplinary assumptions and the specific theoretical lens of the encoder. In the context of a novel, this might mean deciding whether to privilege the physical page breaks of a first edition or the logical paragraph structure of the author's manuscript. It involves determining where "direct speech" begins and ends, a decision that can be fraught with ambiguity in experimental fiction where quotation marks may be absent or used unconventionally.The TEI P5 Guidelines provide a vocabulary for these descriptions, but they do not dictate a single "correct" encoding. Instead, they offer a framework—a set of modules and classes—that can be customized to suit the "manifold variability of humanistic text". This flexibility is the TEI's greatest strength, allowing it to serve projects ranging from the massive Wright American Fiction collection, which seeks to encompass every American novel published between 1851 and 1875 , to boutique critical editions of single works like Jane Eyre or Middlemarch. However, this flexibility also necessitates rigorous documentation and validation to prevent the emergence of idiosyncratic standards—what one might characterize as the "nobody-understands-my-problems" standard—where encoding becomes so specific to a single project that it loses interoperability with the broader digital ecosystem.1.2 The Distinction Between Text and DocumentA foundational concept in TEI encoding is the distinction between the "text" (the intellectual content) and the "document" (the physical carrier). TEI serves to encode the text primarily, but it provides robust mechanisms for describing the document. In a novel, the "text" comprises the narrative, the characters' voices, and the chapter divisions. The "document" comprises the page breaks, the running headers, the specific typography, and the binding.A rigorous TEI edition must decide where it stands on this spectrum. A "diplomatic" transcription might prioritize the document, encoding every line break (<lb>) and page break (<pb>) exactly as they appear in the source. A "reading" edition might normalize these features, focusing instead on the logical flow
  <teiHeader>
    </teiHeader>
  <text>
    </text>
</TEI>
Without this namespace declaration, software tools (like XSLT processors or web browsers) will not recognize the elements as TEI, treating them instead as generic XML. This can lead to validation errors and display issues. The TEI root element may also carry an @xml:lang attribute to specify the default language of the document, such as xml:lang="en" for an English novel.2.2 Unitary vs. Composite TextsA fundamental structural distinction in TEI, which profoundly affects how novels are encoded, is the difference between unitary and composite texts.Unitary Texts: Most novels are considered unitary texts—they form a single, organic whole. Even a novel published in three physical volumes (the Victorian "triple-decker") is typically encoded as a single <text> element containing a single <body>. The volume divisions are handled as internal structural divisions (<div type="volume">) rather than as separate texts.Composite Texts: A collection of short stories, an anthology of novels, or a collected works edition is a composite text. In this scenario, the <text> element contains a <group> element, which in turn contains multiple subordinate <text> elements. This allows each individual story or novel within the collection to have its own front matter, body, and back matter, distinct from the front/back matter of the collection as a whole.Structure for a Composite Text (e.g., A Collection of Short Stories):XML<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    </teiHeader>
  <text>
    <front>
      </front>
    <group>
      <text>
        <front></front>
        <body></body>
      </text>
      <text>
        <front></front>
        <body></body>
      </text>
    </group>
    <back>
      </back>
  </text>
</TEI>
This <group> structure is essential for correctly attributing metadata and structural hierarchy in anthologies, ensuring that the title of a specific story is not confused with the title of the anthology.3. The TEI Header: The Digital Title PageThe <teiHeader> is the electronic analogue to the title page of a printed work, but it is significantly more comprehensive. It constitutes the "code book" or manual for the electronic text, providing the metadata necessary for citation, cataloging, processing, and preservation. For a novel, the header must support the diverse needs of librarians, literary scholars, and software tools. It is divided into four major sections: <fileDesc>, <encodingDesc>, <profileDesc>, and <revisionDesc>.3.1 File Description (<fileDesc>)The <fileDesc> contains the full bibliographic description of the computer file itself. This is the only mandatory section of the header and is composed of three required subsections: the title statement, the publication statement, and the source description.3.1.1 Title Statement (<titleStmt>)This element groups information about the title of the work and those responsible for its content. In a digital edition, it is crucial to distinguish between the creators of the digital file and the creators of the original work.<title>: The title of the digital resource (e.g., "Jane Eyre: A Digital Edition"). Attributes like @type can distinguish between the main title and sub (subtitle).<author>: The author of the intellectual content (e.g., Charlotte Brontë).<respStmt>: This element allows for the declaration of other contributors, such as the encoder, editor, or transcriber. It pairs a <resp> (responsibility) with a <name> (person). For example:XML<respStmt>
  <resp>Encoded by</resp>
  <name>Digital Humanities Lab</name>
</respStmt>
This acknowledgment is vital for academic credit in digital scholarship.3.1.2 Publication Statement (<publicationStmt>)This section details the publication or distribution of the electronic text. It acts as the "imprint" for the digital file.<publisher> / <distributor>: The organization making the file available (e.g., "Project Gutenberg," "Oxford Text Archive").<pubPlace>: The location of the publisher.<date>: The date of the digital publication.<availability>: This is critical for copyright and licensing. It typically contains a <licence> element pointing to a standard license (like Creative Commons) or a text block describing usage rights.XML<availability status="free">
  <licence target="https://creativecommons.org/licenses/by/4.0/">Distributed under CC BY 4.0</licence>
</availability>
3.1.3 Source Description (<sourceDesc>)For scholarly editions, this is perhaps the most important metadata section. It describes the physical object(s) used as the basis for the digital text.<bibl> vs. <biblStruct>: While <bibl> allows for a loose, prose-like description, <biblStruct> is preferred for structured data that can be easily parsed by citation managers. It uses elements like <monogr> (monograph) to group bibliographic details.Born-Digital Texts: If the novel has no print antecedent (e.g., it was written originally for the web), the <sourceDesc> might contain a simple statement: <p>Born digital text.</p> or <bibl>Created electronically</bibl>.Manuscript Sources: If the source is a manuscript (e.g., the hand-written draft of Frankenstein), the <msDesc> element (from the msdescription module) provides a specialized structure for describing physical features like foliation, hand, and condition.Table 1: Key Elements of the File DescriptionElementDescriptionExample Usage in Novel Encoding<titleStmt>Information about the title of the work and those responsible for its content.Listing the digital editor and original author.<editionStmt>Information regarding the edition of the text."Version 2.0, correcting OCR errors."<publicationStmt>Information concerning the publication or distribution of the electronic text.Specifying a GitHub repository or university archive.<sourceDesc>A description of the source from which the electronic text was derived.Full bibliographic citation of the 1847 Smith, Elder & Co. edition.3.2 Encoding Description (<encodingDesc>)The <encodingDesc> documents the relationship between the electronic text and the source. It is the place to record the "interpretive" decisions that define the edition.<projectDesc>: Describes the goals of the project (e.g., "To create a searchable corpus of 19th-century sensation fiction").<samplingDecl>: If the text is a sample (e.g., "The first chapter of 100 novels"), this element explains the rationale and extent of the sampling.<editorialDecl>: This is essential for transparency. It details editorial principles such as:<normalization>: Did the editor expand abbreviations or modernize spelling?<hyphenation>: How were end-of-line hyphens in the source treated? (e.g., "Soft hyphens were silently removed.")<quotation>: How were quotation marks processed? (e.g., "All quotation marks were replaced with <q> elements.").<correction>: Were obvious typographic errors in the source corrected? If so, using what method (silently or with <sic>/<corr> tags)?3.3 Profile Description (<profileDesc>)The <profileDesc> provides a detailed description of non-bibliographic aspects of the text, specifically those related to its content and context.<langUsage>: Specifies the languages used in the text. A novel like War and Peace or Villette would list multiple languages here (e.g., Russian/French or English/French).XML<langUsage>
  <language ident="en">English</language>
  <language ident="fr">French</language>
</langUsage>
<creation>: Distinguishes the date of composition from the date of publication. This is vital for manuscripts or posthumously published works (e.g., a novel written in 1914 but published in 1920).<textClass>: Classifies the text using keywords or subject headings. This might include genre labels like "Gothic fiction," "Bildungsroman," or "Epistolary novel."<particDesc> (Participant Description): Within this element, a <listPerson> can be used to define all the characters in the novel. Each character is given an @xml:id (e.g., xml:id="Jane"), which allows references in the text to be linked back to this definition. This is the foundation of social network analysis in literary studies.3.4 Revision Description (<revisionDesc>)The <revisionDesc> serves as a change log for the file. It contains a list of <change> elements, each documenting a specific modification, the date it occurred, and the person responsible. This is crucial for version control in long-running projects.4. Textual Structure and DivisionsThe <text> element contains the actual content of the novel. The TEI Guidelines provide a robust mechanism for representing the hierarchical structure of books through the front, body, and back elements. This structure mirrors the physical object of the book, allowing the digital edition to preserve the "front matter" (preliminaries) and "back matter" (endnotes, ads) that are often discarded in commercial e-book formats but are vital for bibliographic analysis.4.1 Front Matter (<front>)The <front> element contains all prefatory matter found at the start of the document before the main narrative begins. In 19th-century novels, this section can be extensive and rhetorically significant.Title Pages: The title page is encoded using the <titlePage> element. It typically contains:<docTitle>: The title of the document as it appears on the page.<docAuthor>: The author's name as printed.<docImprint>: Publication details (publisher, place, date).<epigraph>: A quotation or motto often found on title pages.Prefaces and Dedications: These are encoded as divisions (<div>) with a specific type attribute, such as <div type="preface"> or <div type="dedication">. This typing allows systems to distinguish the author's preface from the main narrative.Table of Contents: This can be encoded as a <div type="contents"> containing a <list>. If the table of contents is to be generated automatically from the headings in the body, a placeholder element <divGen type="toc"/> can be used.4.2 The Body (<body>)The <body> contains the primary narrative. The segmentation of the body is one of the most visible editorial interventions. TEI offers two systems for division: numbered (<div1>, <div2>) and un-numbered (<div>).4.2.1 Un-numbered Divisions (<div>)The un-numbered <div> element is the recommended style for modern TEI projects due to its flexibility. Divisions can nest recursively to any depth. The type attribute is essential for identifying the structural role of the division.<div type="volume">: For the volumes of a multi-volume novel.<div type="book"> or <div type="part">: For major subdivisions within a volume.<div type="chapter">: For the standard chapter unit.Example of Nested Divisions in a Triple-Decker Novel:XML<body>
  <div type="volume" n="1">
    <head>Volume I</head>
    <div type="chapter" n="1">
      <head>Chapter I</head>
      <p>There was no possibility of taking a walk that day...</p>
    </div>
    </div>
  <div type="volume" n="2">
    <head>Volume II</head>
    </div>
</body>
4.2.2 Numbered Divisions (<div1>...<div7>)These elements enforce a strict hierarchy: a <div2> must be contained within a <div1>, and so on. While this ensures a rigid structure, it can be inflexible if the text's structure changes mid-project. This style is less common in new projects but may be found in legacy SGML conversions or specific corpora like the Wright American Fiction collection.4.3 Back Matter (<back>)The <back> element follows the body and contains appendices, glossaries, notes, and bibliographies. Like the front matter, these are encoded as divisions. For example, a glossary might be encoded as <div type="glossary"> containing a <list> or <listBibl>. In scholarly editions, this section might also contain the editor's textual notes or a list of emendations.4.4 Floating Texts (<floatingText>)Novels often contain other texts embedded within them: a character reads a letter, finds a manuscript, or recites a poem. The <floatingText> element allows these embedded texts to have their own internal structure (front, body, back) without breaking the hierarchy of the main text.Example of an Embedded Letter:XML<p>Jane opened the letter and read:</p>
<floatingText type="letter">
  <body>
    <opener>
      <salute>My Dear Jane,</salute>
    </opener>
    <p>I am writing to you from...</p>
    <closer>
      <signed>St. John Rivers</signed>
    </closer>
  </body>
</floatingText>
This structure preserves the formal characteristics of the letter (salutation, signature) which would be lost if it were merely encoded as a quoted block.5. Semantic Encoding of Prose FictionWhile structural encoding is essential for navigation and display, the semantic enrichment of the text allows for advanced computational analysis. By tagging features such as direct speech, character names, and places, the edition becomes a database capable of supporting research in stylometry, social network analysis, and distant reading.5.1 Direct Speech, Thought, and Narrative VoiceOne of the most complex and theoretically charged aspects of encoding fiction is handling speech. The TEI provides several elements for this, principally <q> (quote) and <said>.5.1.1 The <q> ElementThe <q> element is a generic marker for quoted text. It is often used to mark direct speech that is distinguished by quotation marks in the source.Usage: <q>I am going to town,</q> said Mrs. Bennet.Attributes: @type can be used to distinguish "speech", "thought", or "written" (e.g., reading a letter).Ambiguity: The <q> element implies that the text is marked as a quote in the source (e.g., with inverted commas). However, it does not necessarily imply "speech" in a semantic sense. A scare quote or a citation would also use <q>.5.1.2 The <said> ElementThe <said> element is more semantically specific and powerful. It indicates passages that are spoken or thought, regardless of whether they are enclosed in quotation marks in the source. This is particularly useful for free indirect discourse or modernist texts where punctuation is absent or ambiguous.Attributes:@who: Links the speech to a character (defined in the header). This allows for the programmatic extraction of all lines spoken by a specific character.@direct: "true" for direct speech, "false" for indirect speech.@aloud: "true" for vocalized speech, "false" for internal thought.Comparison Example:Source: "She thought, he is quite unbearable."Encoding A (Visual/Diplomatic):XML<p>She thought, <q>he is quite unbearable.</q></p>
Encoding B (Semantic/Interpretive):XML<p>She thought, <said who="#Lizzie" direct="true" aloud="false">he is quite unbearable.</said></p>
The use of <said> allows a researcher to differentiate between what a character says and what they think, a distinction vital for analyzing character interiority.5.2 Characters, Names, and PlacesIdentifying real-world or fictional entities is a core task in creating a "rich" edition.Names: The <name> element is generic. TEI provides more specific elements like <persName> (person) and <placeName> (place) to semantically distinguish entities.Referencing Strings (<rs>): When a character is referred to by a phrase (e.g., "The Master of the house") rather than a proper name, the <rs> element is used. The @ref or @key attribute links this phrase to the character's entity definition.Example: The <rs ref="#Rochester">Master</rs> called for his horse.Registry: It is best practice to maintain a prosopography (list of persons) in the teiHeader under <profileDesc>/<particDesc>/<listPerson>. This centralized list enables the disambiguation of characters (e.g., distinguishing "young Cathy" from "Catherine Earnshaw" in Wuthering Heights).5.3 Materiality: Page Breaks and LayoutScholarly editions often aim to link the text to its physical source, preserving the connection between the abstract text and the material artifact.Page Breaks (<pb>): This is an empty element that marks the boundary between pages.@n: The page number printed on the page.@facs: A URL or identifier linking to a facsimile image of the page. This allows the digital edition to present the text and image side-by-side.Line Breaks (<lb>): Marks the start of a new line. While less critical in prose than in poetry, recording line breaks is useful for synchronizing with page images or analyzing hyphenation.Column Breaks (<cb>): Used in multi-column layouts, which are common in 19th-century periodicals where many novels were first serialized.Hyphenation: When a word is broken across a line or page, TEI encoders must decide whether to reconstruct the word or preserve the hyphen. The <choice> element with <orig> (original) and <reg> (regularized) children can handle this.Example: <choice><orig>tomo-<lb/>rrow</orig><reg>tomorrow</reg></choice>.Alternatively, the hyphen may be silently removed in the <body> text to facilitate full-text search, while the <pb> records the break.6. Schema Customization: The Role of ODDA raw TEI schema (TEI All) contains over 500 elements, many of which (like <notatedMusic>, <uicControl>, or specialized linguistic tags) are irrelevant for a typical novel. To ensure consistency, ease of use, and data quality, it is essential to create a customization. In TEI, this is done using an ODD (One Document Does it all) file.6.1 The ODD PhilosophyODD is a "literate programming" format that combines human-readable documentation with machine-readable schema specifications. From a single ODD file, one can generate:Schemas: Relax NG (RNG), DTD, or W3C Schema (XSD) for validation.Documentation: HTML or PDF guidelines for the project's encoders, ensuring that the rules of the project are clearly communicated.6.2 Designing an ODD for NovelsFor a novel project, one typically starts with a minimal base and adds necessary modules. This process involves "chaining" customizations or starting from a template.Modules to Include:tei: The infrastructure module (required).header: Metadata (required).core: Basic paragraphs, lists, highlights (<p>, <list>, <hi>).textstructure: Front, body, back, divisions (<div>).namesdates: For rich character encoding (<persName>, <placeName>).linking: For segmentation and alignment (<seg>, <anchor>).transcr: If doing detailed manuscript transcription (additions, deletions).Constraint and Modification:Attribute Modification: An ODD can restrict the values of an attribute. For example, one could restrict the @type attribute on <div> to allow only "volume", "chapter", "part", avoiding inconsistencies like "chap", "ch", "Section", or "Book". This ensures structural consistency across the corpus.Element Deletion: Elements that might confuse encoders (e.g., <ab> vs <p>) can be deleted from the schema to reduce ambiguity.Example ODD Snippet (<schema
  <moduleRef key="core"/>
  <moduleRef key="tei"/>
  <moduleRef key="header"/>
  <moduleRef key="textstructure"/>
  
  <elementSpec ident="div" mode="change">
    <attList>
      <attDef ident="type" mode="change">
        <valList type="closed" mode="replace">
          <valItem ident="volume"/>
          <valItem ident="chapter"/>
          <valItem ident="part"/>
        </valList>
      </attDef>
    </attList>
  </elementSpec>
</schemaSpec>
This snippet ensures that an encoder cannot create a div with a typo like type="chapetr", as the validation will fail.6.3 TEI Simple and SimplePrintFor projects that do not require deep customization, "TEI Simple" (or its successor configurations like TEI SimplePrint) offers a stripped-down, highly prescriptive subset of TEI designed for modern printed books. It drastically reduces the number of elements and enforces strict processing models, making it easier to convert to web (HTML) or print (PDF) formats. This is often the best starting point for a standard novel edition, as it provides a "best practice" baseline without the complexity of the full TEI Guidelines.6.4 Schematron ConstraintsBeyond structural rules, ODD allows the embedding of Schematron rules to enforce semantic constraints. Schematron is a rule-based validation language that uses XPath to test assertions.Rule Example: "Every <div type="chapter"> must have a <head> element."Rule Example: "The @who attribute on <said> must point to an @xml:id that actually exists in the listPerson."These rules act as automated quality assurance, catching errors that are valid XML but invalid according to the project's intellectual design.7. Production WorkflowsThe production of a TEI novel involves a pipeline of transformation and refinement, moving from the physical or image-based source to the polished semantic XML.7.1 Text Capture and TranscriptionThe source text is usually acquired via OCR (Optical Character Recognition) or manual keying.OCR: Modern OCR engines (like Tesseract) can output hOCR or ALTO XML, which map page coordinates. These formats must be transformed into TEI. Tools like "Lace" or "Transkribus" help bridge this gap, especially for historical fonts or manuscripts.Manual Transcription: For high-precision editions, manual transcription is often required. This can be done directly in an XML editor or in a word processor using strict styling conventions.7.2 Conversion: OxGarage and StylesheetsA common workflow for projects without extensive technical resources is Word -> TEI. The TEI Consortium provides OxGarage (and the underlying TEI Stylesheets), a tool that converts DOCX files to TEI XML based on style names.Prepare the DOCX: Ensure "Chapter 1" is styled as Heading 1, paragraphs as Normal, and block quotes as Quote.Convert: Upload the document to the OxGarage web service or run the command-line stylesheets.Result: A "raw" TEI file that has the correct structure (div, head, p) but lacks semantic richness (no persName or said). This file serves as the baseline for further editing.7.3 The XML Editing Environment (Oxygen)Once the raw XML is generated, it is loaded into an XML Editor for refinement. Oxygen XML Editor is the industry standard for this work due to its robust support for TEI.Associate Schema: The XML file must be linked to the ODD-generated Relax NG schema. This enables "Intelligent Editing" (autocompletion and real-time error checking).Refinement: The editor uses Find/Replace or Regular Expressions (Regex) to tag recurring features. For example, a regex could find all dates (e.g., "14th of May") and wrap them in <date> tags.Grid Mode: Oxygen offers a "Grid Mode" that displays the XML as a spreadsheet-like table, which can be useful for editing repetitive structures like lists or bibliographies.Author Mode: This mode presents the XML in a CSS-styled WYSIWYG view, allowing editors who are less comfortable with raw code to work on the text while the editor handles the tags in the background.8. Validation and Quality AssuranceValidation is the process of checking whether the XML document adheres to the rules defined in the schema. In a rigorous TEI workflow, validation occurs at two distinct levels: structural (grammar-based) and semantic (rule-based).8.1 Structural Validation (Relax NG)Relax NG (RNG) is the grammar-based schema language used by TEI. It defines the hierarchy and vocabulary of the XML.Content Models: It defines that a p can contain a q, but a q cannot contain a div.Attributes: It defines that a div can have a type attribute, but n
<?xml-model href="myProject.sch" type="application/xml" schematypens="http://purl.oclc.org/dsdl/schematron"?>
9. ConclusionCreating and validating TEI XML for novels is a disciplined interplay of literary theory and information architecture. It moves beyond the simple reproduction of text on a screen to create a structured, semantically rich dataset that can support centuries of future scholarship. By rigorously defining the structure in the teiHeader, carefully segmenting the narrative in the body, and semantically enriching the content with <said> and <persName>, the encoder creates a digital witness that is far more durable and versatile than a PDF or plain text file.Through the mechanism of ODD, the specific interpretive model of the edition is formalized and enforced, ensuring that the digital novel remains a reliable witness to its source and a fertile ground for future inquiry. Whether for a massive corpus analysis or a definitive critical edition, the principles outlined here form the bedrock of digital literary studies.10. Technical Appendix: Validated Examples and Tools10.1 Complete TEI Header for a NovelThe following is a fully expanded example of a header for a digital edition of Jane Eyre, demonstrating best practices for bibliographic description.XML<teiHeader>
  <fileDesc>
    <titleStmt>
      <title type="main">Jane Eyre: An Autobiography</title>
      <title type="sub">A Digital Edition</title>
      <author>Charlotte Brontë</author>
      <editor role="encoder">Digital Humanities Lab</editor>
    </titleStmt>
    <publicationStmt>
      <publisher>University Digital Library</publisher>
      <date when="2025">2025</date>
      <availability status="free">
        <license target="https://creativecommons.org/licenses/by/4.0/">
          Distributed under a CC-BY 4.0 license.
        </license>
      </availability>
    </publicationStmt>
    <sourceDesc>
      <biblStruct>
        <monogr>
          <author>Currer Bell</author>
          <title>Jane Eyre: An Autobiography</title>
          <edition>First Edition</edition>
          <imprint>
            <publisher>Smith, Elder, and Co.</publisher>
            <pubPlace>London</pubPlace>
            <date when="1847">1847</date>
          </imprint>
          <biblScope unit="volume">1</biblScope>
        </monogr>
      </biblStruct>
    </sourceDesc>
  </fileDesc>
  <encodingDesc>
    <editorialDecl>
      <p>Hyphenation has been removed. Direct speech is marked with 'said'.</p>
    </editorialDecl>
  </encodingDesc>
  <profileDesc>
    <langUsage>
      <language ident="en">English</language>
      <language ident="fr">French</language>
    </langUsage>
    <particDesc>
      <listPerson>
        <person xml:id="Jane">
          <persName>Jane Eyre</persName>
        </person>
        <person xml:id="Rochester">
          <persName>Edward Rochester</persName>
        </person>
      </listPerson>
    </particDesc>
  </profileDesc>
</teiHeader>
10.2 Encoding a Novel Chapter with Direct SpeechThis snippet demonstrates the integration of structural divisions, page breaks, and semantic speech tagging.XML<text>
  <body>
    <div type="chapter" n="1">
      <pb n="1" facs="page1.jpg"/>
      <head>Chapter I</head>
      <p>There was no possibility of taking a walk that day.</p>
      <p>
        <said who="#Jane" direct="true" aloud="true">
          <q>What does Bessie say I have done?</q>
        </said> I asked.
      </p>
      <p>
        <said who="#Bessie" direct="true" aloud="true">
          <q>Jane, I don't like cavillers or questioners,</q>
        </said> replied Bessie.
      </p>
    </div>
  </body>
</text>
10.3 Tools TableTable 2: Recommended Tools for TEI Novel ProductionCategoryTool NameFunctionUse CaseTranscriptionTranskribus / LaceAI-assisted OCR and HTR.Converting manuscript images to text.ConversionOxGarageConverts DOCX/PDF to TEI XML.Initial batch conversion of typed text.EditingOxygen XML EditorThe standard IDE for XML.Manual encoding, validation, and XSLT.Schema DesignRoma / RomaJSWeb interface for ODDs.Creating and maintaining custom schemas.PublishingTEI PublisherPublishing framework.Displaying TEI as HTML or PDF online.ValidationJing / ANTCommand-line validation.Automated testing in CI/CD pipelines.
