# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - button "Upload TEI File" [ref=e4]
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - button "Manual" [ref=e8]
          - button "AI Suggest" [ref=e9]
          - button "AI Auto" [ref=e10]
        - button "Bulk Operations (0) ⌘B" [ref=e11]:
          - text: Bulk Operations (0)
          - generic [ref=e12]: ⌘B
        - button "Visualizations" [ref=e13]
        - generic [ref=e14]:
          - button "Export HTML" [ref=e15]
          - button "Export TEI" [ref=e16]
        - button "?" [ref=e17]:
          - img
          - generic [ref=e18]: "?"
      - generic [ref=e19]:
        - generic [ref=e20]:
          - heading "Rendered View" [level=2] [ref=e22]
          - generic [ref=e26]: No passages found in document
        - generic [ref=e29]:
          - heading "TEI Source" [level=2] [ref=e30]
          - generic [ref=e31]: <?xml version="1.0" encoding="UTF-8"?> <TEI xmlns="http://www.tei-c.org/ns/1.0"> <teiHeader> <fileDesc> <titleStmt> <title>Test Document</title> </titleStmt> </fileDesc> </teiHeader> <text> <body> <castList> <castItem> <role xml:id="speaker1">speaker1</role> </castItem> </castList> <p> <s who="#speaker1">Test passage 1</s> </p> <p> <s who="#speaker1">Test passage 2</s> </p> </body> </text> </TEI>
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e37] [cursor=pointer]:
    - img [ref=e38]
  - alert [ref=e41]
```