from fpdf import FPDF

# Create PDF class
class PDF(FPDF):
    def header(self):
        self.set_font("Arial", "B", 12)
        self.cell(200, 10, "Doctor's Report - Pregnancy Assessment", ln=True, align="C")
        self.ln(10)

# Create PDF object
pdf = PDF()
pdf.add_page()
pdf.set_font("Arial", size=12)

# Sample Doctor's Report Content
content = '''
Patient Name: Jane Doe
Age: 28
Blood Pressure: 130/85 mmHg
Blood Sugar: 95 mg/dL
Heart Rate: 82 bpm
Pregnancy Risk Level: Moderate
Diagnosed Conditions: Mild Hypertension, Iron Deficiency

Doctor's Notes:
- Monitor blood pressure regularly.
- Increase iron intake (spinach, lentils, red meat).
- Follow a healthy pregnancy diet with prenatal vitamins.
- Maintain hydration and avoid excessive salt intake.

Recommended Nutrition Plan:
- High-iron foods: Leafy greens, lentils, red meat, fortified cereals.
- Omega-3 fatty acids: Fish, flaxseeds, walnuts.
- Calcium-rich foods: Dairy products, tofu, almonds.
- Protein sources: Eggs, beans, lean meats.

Next Check-up: In 2 weeks
'''

# Add content to PDF
pdf.multi_cell(0, 10, content)

# Save the PDF file
pdf.output("sample_doctor_report.pdf")

print("Sample Doctor's Report generated: sample_doctor_report.pdf")
