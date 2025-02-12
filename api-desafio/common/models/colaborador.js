"use strict";

module.exports = function (Colaborador) {
  //atualiza medidas (coloca as outras medidas no histórico)
  //get medidas passando a data

  Colaborador.getMedidasData = async function (data, id) {
    var dataAux = new Date(data);
    var dataAux2 = new Date(data);
    dataAux2.setDate(dataAux.getDate() + 1);

    return Colaborador.aggregate({
      where: { _id: id },
      aggregate: [
        {
          $unwind: {
            path: "$historicoMedidas",
          },
        },
        {
          $match: {
            $and: [
              {
                "historicoMedidas.dataHora": {
                  $gte: dataAux,
                },
              },
              {
                "historicoMedidas.dataHora": {
                  $lt: dataAux2,
                },
              },
            ],
          },
        },
        {
          $project: {
            _id: 0,
            peso: "$historicoMedidas.peso",
            altura: "$historicoMedidas.altura",
            dataHora: "$historicoMedidas.dataHora",
            imc: "$historicoMedidas.imc",
          },
        },
        {
          $sort:{
            dataHora: -1
          }
        }
      ],
    })
      .then(function (medidas) {
        return Promise.resolve(medidas);
      })
      .catch(function (err) {
        console.log(err);
      });
  };

  Colaborador.remoteMethod("getMedidasData", {
    description: "Retorna as medidas de um colaborador em uma data específica",
    accepts: [
      {
        arg: "data",
        type: "string",
        required: true,
      },
      {
        arg: "id",
        type: "string",
        required: true,
      },
    ],
    http: {
      path: "/:id/Medidas/:data",
      verb: "get",
    },
    returns: {
      type: [
        {
          peso: {
            type: "number",
          },
          altura: {
            type: "number",
          },
          dataHora: {
            type: "date",
          },
          imc: {
            type: {
              valor: { type: "number" },
              classificacao: { type: "string" },
            },
          },
        },
      ],
      root: true,
    },
  });

  Colaborador.updateMedida = async function (id, novaMedida) {
    return Colaborador.findById(id).then(function (colab) {
      var novoHistoricoMedidas = [];
      novoHistoricoMedidas = colab.historicoMedidas;

      if(colab.medida !== null){
        novoHistoricoMedidas.push({
          peso: colab.medida.peso,
          altura: colab.medida.altura,
          dataHora: colab.medida.dataHora,
          imc: {
            valor: colab.medida.imc.valor,
            classificacoa: colab.medida.imc.classificacao,
          },
        })
      }

      colab.updateAttributes(
        {
          medida: {
            peso: novaMedida.peso,
            altura: novaMedida.altura,
            dataHora: novaMedida.dataHora,
            imc: novaMedida.imc,
          },
          historicoMedidas: novoHistoricoMedidas,
        },
        function (err, instance) {
          console.log(instance);
        }
      );
    });
  };
  Colaborador.remoteMethod("updateMedida", {
    description:
      "Atualiza a medida de um colaborador e adiciona a antiga ao histórico",
    accepts: [
      {
        arg: "id",
        type: "string",
        required: true,
      },
      {
        arg: "novaMedida",
        type: {
          peso: {
            type: "number",
          },
          altura: {
            type: "number",
          },
          dataHora: {
            type: "date",
          },
          imc: {
            type: {
              valor: { type: "number" },
              classificacao: { type: "string" },
            },
          },
        },
        required: true,
        http: {
          source: "body",
        },
      },
    ],
    http: {
      path: "/:id/Medida",
      verb: "put",
    },
    returns: {
      arg: "novaMedida",
      type: {
        peso: {
          type: "number",
        },
        altura: {
          type: "number",
        },
        dataHora: {
          type: "date",
        },
        imc: {
          type: {
            valor: { type: "number" },
            classificacao: { type: "string" },
          },
        },
      },
    },
  });

  Colaborador.getResumoImc = async function () {
    return Colaborador.aggregate({
      aggregate: [
        { $sortByCount: "$medida.imc.classificacao" },
        {
          $project: {
            _id: 0,
            x: "$_id",
            y: "$count",
          },
        },
      ],
    })
      .then(function (medidas) {
        return Promise.resolve(medidas);
      })
      .catch(function (err) {
        console.log(err);
      });
  };

  Colaborador.remoteMethod("getResumoImc", {
    description: "Retorna o número de colaboradores por imc",
    http: {
      path: "/Medidas/resumo/imc",
      verb: "get",
    },
    returns: {
      type: [{}],
      root: true,
    },
  });

  Colaborador.getNumCadastros = async function () {
    return Colaborador.aggregate({
      aggregate: [
        {
          $project: {
            dataCadastro: {
              $dateFromParts: {
                year: { $year: "$dataCadastro" },
                month: { $month: "$dataCadastro" },
                day: { $dayOfMonth: "$dataCadastro" },
                hour: 0,
              },
            },
          },
        },
        {
          $facet: {
            anual: [
              {
                $group: {
                  _id: { $dateFromParts: { year: { $year: "$dataCadastro" } } },
                  count: { $sum: 1 },
                },
              },
              { $sort: { _id: -1 } },
              { $limit: 10 },
              { $project: { _id: 0, x: { $year: "$_id" }, y: "$count" } },
            ],

            mensal: [
              {
                $group: {
                  _id: {
                    $dateFromParts: {
                      year: { $year: "$dataCadastro" },
                      month: { $month: "$dataCadastro" },
                    },
                  },
                  count: { $sum: 1 },
                },
              },
              { $sort: { _id: -1 } },
              { $limit: 12 },
              {
                $project: {
                  _id: 0,
                  x: {
                    $concat: [
                      { $toString: { $month: "$_id" } },
                      "-",
                      { $toString: { $dayOfMonth: "$_id" } },
                      "-",
                      { $toString: { $year: "$_id" } },
                      " GMT",
                    ],
                  },
                  y: "$count",
                },
              },
            ],

            diario: [
              {
                $group: {
                  _id: {
                    $dateFromParts: {
                      year: { $year: "$dataCadastro" },
                      month: { $month: "$dataCadastro" },
                      day: { $dayOfMonth: "$dataCadastro" },
                    },
                  },
                  count: { $sum: 1 },
                },
              },
              { $sort: { _id: -1 } },
              { $limit: 31 },
              {
                $project: {
                  _id: 0,
                  x: {
                    $concat: [
                      { $toString: { $month: "$_id" } },
                      "-",
                      { $toString: { $dayOfMonth: "$_id" } },
                      "-",
                      { $toString: { $year: "$_id" } },
                      " GMT",
                    ],
                  },
                  y: "$count",
                },
              },
            ],
          },
        },
      ],
    })
      .then(function (medidas) {
        return Promise.resolve(medidas);
      })
      .catch(function (err) {
        console.log(err);
      });
  };

  Colaborador.remoteMethod("getNumCadastros", {
    description: "Retorna o número de cadastros agrupados por, dia, mês e ano",
    http: {
      path: "/num/cadastros",
      verb: "get",
    },
    returns: {
      type: [{}],
      root: true,
    },
  });

  Colaborador.getUltimaAvaliacaoColaborador = async function (id) {
    return Colaborador.aggregate({
      where: { _id: id },
      aggregate: [
        {
          $lookup: {
            from: "Avaliacao",
            localField: "_id",
            foreignField: "ColaboradorId",
            as: "avaliacoes",
          },
        },
        {
          $unwind: {
            path: "$avaliacoes",
          },
        },
        {
          $group: {
            _id: "$_id",
            dataHora: {
              $max: "$avaliacoes.dataHora",
            },
            pulso: {
              $last: "$avaliacoes.pulso",
            },
            pSistolica: {
              $last: "$avaliacoes.pSistolica",
            },
            pDiastolica: {
              $last: "$avaliacoes.pDiastolica",
            },
            hipertensao: {
              $last: "$avaliacoes.hipertensao",
            },
          },

        },
        {
          $sort:{
            dataHora: -1
          }
        }
      ],
    })
      .then(function (avaliacao) {
        return Promise.resolve(avaliacao);
      })
      .catch(function (err) {
        console.log(err);
      });
  };

  Colaborador.remoteMethod("getUltimaAvaliacaoColaborador", {
    description: "Retorna a última avaliação de um colaborador",
    accepts: [
      {
        arg: "id",
        type: "string",
        required: true,
      },
    ],
    http: {
      path: "/:id/avaliacao/ultima",
      verb: "get",
    },
    returns: {
      type: {},
      root: true,
    },
  });

  Colaborador.getAvaliacaoColaboradorData = async function (id, data) {
    var dataAux = new Date(data);
    var dataAux2 = new Date(data);
    dataAux2.setDate(dataAux.getDate() + 1);

    return Colaborador.aggregate({
      where: { _id: id },
      aggregate: [
        {
          $lookup: {
            from: "Avaliacao",
            localField: "_id",
            foreignField: "ColaboradorId",
            as: "avaliacoes",
          },
        },
        {
          $unwind: {
            path: "$avaliacoes",
          },
        },
        {
          $match: {
            $and: [
              {
                "avaliacoes.dataHora": {
                  $gte: dataAux,
                },
              },
              {
                "avaliacoes.dataHora": {
                  $lt: dataAux2,
                },
              },
            ],
          },
        },
        {
          $project: {
            _id: 0,
            id: "$avaliacoes._id",
            hipertensao: "$avaliacoes.hipertensao",
            pSistolica: "$avaliacoes.pSistolica",
            pDiastolica: "$avaliacoes.pDiastolica",
            pulso: "$avaliacoes.pulso",
            dataHora: "$avaliacoes.dataHora",
          },
        },
      ],
    })
      .then(function (avaliacoes) {
        return Promise.resolve(avaliacoes);
      })
      .catch(function (err) {
        console.log(err);
      });
  };

  Colaborador.remoteMethod("getAvaliacaoColaboradorData", {
    description:
      "Retorna as avaliações de um colaborador em uma data específica",
    accepts: [
      {
        arg: "id",
        type: "string",
        required: true,
      },
      {
        arg: "data",
        type: "string",
        required: true,
      },
    ],
    http: {
      path: "/:id/avaliacao/:data",
      verb: "get",
    },
    returns: {
      type: {},
      root: true,
    },
  });
};
