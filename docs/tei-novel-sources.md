Yes, there are several significant repositories where you can find full TEI-encoded novels. Examining existing examples is often the best way to understand how the guidelines are applied in practice.

Here are the most accessible sources for TEI-encoded novels:

### 1. The Wright American Fiction 1851-1875

This is one of the largest collections of TEI-encoded novels available. It attempts to include every novel published in the United States during that period.

* **Content:** Approximately 3,000 American novels.
* **Access:** The Indiana University Libraries have made the TEI/XML files available on GitHub.
* **TEI Version:** Originally encoded in earlier versions (SGML/TEI P4), many have been migrated, but you may encounter older structures.

### 2. Victorian Women Writers Project (VWWP)

Hosted by Indiana University, this project focuses on British women writers of the 19th century.

* **Content:** Novels, poetry, and political pamphlets.
* **Access:** The XML files are available in their GitHub repository (`iulibdcs/Victorian-Women-Writers-Project`).
* **TEI Version:** The project has actively worked on migrating texts to TEI P5, making it a good source for modern encoding examples.

### 3. Christof Schöch’s "tei-texts" Repository

For a more manageable collection of clear examples, this GitHub repository contains a collection of French novels (*romans*).

* **Content:** Classic French novels (e.g., works by Verne, Zola).
* **Access:** Available on GitHub under `christofs/tei-texts`, specifically in the `french/romans` directory.
* **Value:** These are often cleaner "reading" editions that are excellent for seeing how basic structural markup (`div`, `p`, `head`) is handled in a simple workflow.



### 4. Oxford Text Archive (OTA)

The OTA is one of the oldest archives of digital literary texts and holds a vast collection of TEI-encoded materials, including the files for *Early English Books Online* (EEBO) and *Eighteenth Century Collections Online* (ECCO).

* **Content:** A massive range of historical and literary texts.
* **Access:** While some texts are restricted, many are open access and can be downloaded from their repository (now part of the Literary and Linguistic Data Service).

### 5. Project Gutenberg

While primarily known for plain text and HTML, Project Gutenberg does offer TEI versions for some of its books.

* **Caveat:** Many of these are older files encoded in TEI P3 or P4 (look for `<TEI.2>` at the top instead of `<TEI>`), or they are automatically generated. They are useful for content but may not always represent current best practices for P5 encoding.

# Sources to TEI corpora

https://github.com/iulibdcs/Indiana-Magazine-of-History.git
https://github.com/iulibdcs/Victorian-Women-Writers-Project.git
https://github.com/iulibdcs/Indiana-Authors-and-Their-Books.git
https://github.com/iulibdcs/Brevier-Legislative-Reports.git
https://github.com/iulibdcs/Wright-American-Fiction.git

https://github.com/christofs/tei-texts.git
