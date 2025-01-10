// Função para enviar o JSON para a API
async function sendDataToAPI() {
  const jsonObject = {
    idUnico: '123',
    nome: 'Exemplo',
    descricao: 'Este é um exemplo de objeto JSON.',
  };

  try {
    // Fazendo a requisição usando fetch
    const response = await fetch('http://localhost:3000/save-json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jsonObject),
    });

    if (!response.ok) {
      throw new Error(`Erro: ${response.status}`);
    }

    const data = await response.json();
    document.getElementById(
      'responseMessage'
    ).innerText = `Resposta da API: ${data.message}, Caminho: ${data.path}`;
  } catch (error) {
    document.getElementById(
      'responseMessage'
    ).innerText = `Erro ao chamar API: ${error.message}`;
  }
}
