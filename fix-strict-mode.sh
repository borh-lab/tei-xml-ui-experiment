#!/bin/bash
# Fix strict mode violations in e2e tests

# Fix sample names
sed -i "s/getByText('The Yellow Wallpaper')/getByText('The Yellow Wallpaper').first()/g" tei-editor-real.spec.ts
sed -i "s/getByText('The Gift of the Magi')/getByText('The Gift of the Magi').first()/g" tei-editor-real.spec.ts
sed -i "s/getByText('The Tell-Tale Heart')/getByText('The Tell-Tale Heart').first()/g" tei-editor-real.spec.ts
sed -i "s/getByText('An Occurrence at Owl Creek Bridge')/getByText('An Occurrence at Owl Creek Bridge').first()/g" tei-editor-real.spec.ts
sed -i "s/getByText('Pride and Prejudice - Chapter 1')/getByText('Pride and Prejudice - Chapter 1').first()/g" tei-editor-real.spec.ts
sed -i "s/getByText('Pride and Prejudice', { exact: false })/getByText('Pride and Prejudice', { exact: false }).first()/g" tei-editor-real.spec.ts
sed -i "s/getByText('The Tell-Tale Heart', { exact: false })/getByText('The Tell-Tale Heart', { exact: false }).first()/g" tei-editor-real.spec.ts
sed -i "s/getByText('The Yellow Wallpaper', { exact: false })/getByText('The Yellow Wallpaper', { exact: false }).first()/g" tei-editor-real.spec.ts
sed -i "s/getByText('The Gift of the Magi', { exact: false })/getByText('The Gift of the Magi', { exact: false }).first()/g" tei-editor-real.spec.ts

# Fix UI elements
sed -i "s/getByText('Rendered View')/getByText('Rendered View').first()/g" tei-editor-real.spec.ts
sed -i "s/getByText('TEI Source')/getByText('TEI Source').first()/g" tei-editor-real.spec.ts
sed -i "s/getByText('Character Network')/getByText('Character Network').first()/g" tei-editor-real.spec.ts
sed -i "s/getByText('Dialogue Statistics')/getByText('Dialogue Statistics').first()/g" tei-editor-real.spec.ts
sed -i "s/getByText('Total Dialogue Passages')/getByText('Total Dialogue Passages').first()/g" tei-editor-real.spec.ts

# Fix button roles
sed -i "s/getByRole('button', { name: '← Back to Gallery' })/getByRole('button', { name: '← Back to Gallery' }).first()/g" tei-editor-real.spec.ts
sed -i "s/getByRole('button', { name: 'Manual' })/getByRole('button', { name: 'Manual' }).first()/g" tei-editor-real.spec.ts
sed -i "s/getByRole('button', { name: 'AI Suggest' })/getByRole('button', { name: 'AI Suggest' }).first()/g" tei-editor-real.spec.ts
sed -i "s/getByRole('button', { name: 'AI Auto' })/getByRole('button', { name: 'AI Auto' }).first()/g" tei-editor-real.spec.ts
sed -i "s/getByRole('button', { name: 'Visualizations' })/getByRole('button', { name: 'Visualizations' }).first()/g" tei-editor-real.spec.ts
sed -i "s/getByRole('button', { name: 'Upload TEI File' })/getByRole('button', { name: 'Upload TEI File' }).first()/g" tei-editor-real.spec.ts

# Fix heading and combobox roles
sed -i "s/getByRole('heading', { name: 'Bulk Operations' })/getByRole('heading', { name: 'Bulk Operations' }).first()/g" tei-editor-real.spec.ts
sed -i "s/getByRole('combobox')/getByRole('combobox').first()/g" tei-editor-real.spec.ts

# Fix tab roles
sed -i "s/getByRole('tab', { name: 'Network' })/getByRole('tab', { name: 'Network' }).first()/g" tei-editor-real.spec.ts
sed -i "s/getByRole('tab', { name: 'Statistics' })/getByRole('tab', { name: 'Statistics' }).first()/g" tei-editor-real.spec.ts

# Fix text patterns with regex
sed -i "s/getByText(\ passages selected/i)/getByText(/passages selected/i).first()/g" tei-editor-real.spec.ts
sed -i "s/getByText(\ selected\/i)/getByText(/selected/i).first()/g" tei-editor-real.spec.ts
sed -i "s/getByText(\ Tag all as\/i)/getByText(/Tag all as/i).first()/g" tei-editor-real.spec.ts
sed -i "s/getByText('1 passages selected')/getByText('1 passages selected').first()/g" tei-editor-real.spec.ts
sed -i "s/getByText('2 passages selected')/getByText('2 passages selected').first()/g" tei-editor-real.spec.ts

# Fix placeholder
sed -i "s/getByPlaceholder(\ Type a command or search\/i)/getByPlaceholder(/Type a command or search/i).first()/g" tei-editor-real.spec.ts

# Fix locators
sed -i "s/locator('pre.text-sm.bg-muted')/locator('pre.text-sm.bg-muted').first()/g" tei-editor-real.spec.ts
sed -i "s/locator('p.text-2xl.font-bold')/locator('p.text-2xl.font-bold').first()/g" tei-editor-real.spec.ts

echo "Fixed tei-editor-real.spec.ts"
