#!/usr/bin/env python3
"""Valida o arquivo PDF gerado pelo próprio aplicativo durante o ensaio virtual."""
import sys
from pypdf import PdfReader

path = sys.argv[1]
reader = PdfReader(path, strict=True)
if not reader.pages:
    raise AssertionError("Relatorio PDF vazio")
body = "\n".join(page.extract_text() or "" for page in reader.pages)
for marker in ("RELATORIO DE EXECUCAO DA RONDA", "MAPA DA MICRO E PERCURSO REALIZADO",
               "BURACOS POR BAIRRO", "B001", "B002", "B003",
               "Rua de teste", "Rua Simulada B", "Avenida Simulada C"):
    if marker not in body:
        raise AssertionError(f"Conteudo ausente no PDF: {marker}")
print(f"PDF LEGIVEL: {len(reader.pages)} pagina(s); B001, B002, B003 e 3 vias verificadas.")
print(body[:3000])
