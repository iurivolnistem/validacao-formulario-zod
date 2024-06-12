import { ZodIssueCode, z } from "zod"
import perguntas from './perguntas-egresso.json'
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"

const { perguntas: listaPerguntasJSON } = perguntas

const perguntaSchema = z.object({
    idPergunta: z.string(),
    tipoPergunta: z.string(),
    alternativas: z.array(
        z.object({
            idAlternativa: z.string(),
            marcado: z.boolean().default(false),
            ehComposta: z.string(),
            texto: z.string().optional()
        })
    ).nonempty()
}).superRefine((value, ctx) => {
    if (value.tipoPergunta === 'CheckboxList') {
        if (value.alternativas.filter(a => a.marcado).length === 0) {
            ctx.addIssue({
                code: ZodIssueCode.custom,
                message: 'Você precisa selecionar ao menos uma opção.',
            })
            return z.NEVER
        }

        value.alternativas.filter(a => {
            if (a.marcado && a.ehComposta === 'true') {
                if (a.texto === '') {
                    ctx.addIssue({
                        code: ZodIssueCode.custom,
                        message: 'Você precisa informar o motivo.',
                    })
                    return z.NEVER
                }
            }
        })
    }

    if (value.tipoPergunta === 'RadiobuttonList') {
        if (value.alternativas.filter(a => a.marcado).length === 0) {
            ctx.addIssue({
                code: ZodIssueCode.custom,
                message: 'Você precisa selecionar uma opção.',
            })
            return z.NEVER
        }
    }


    if(value.tipoPergunta === 'TextBox'){
        listaPerguntasJSON.filter(p => {
            if(value.idPergunta === p.pei_codigo.toString() && p.perguntaDependente === undefined){
                if(value.alternativas.some(a => a.texto === '')){
                    ctx.addIssue({
                        code: ZodIssueCode.custom,
                        message: 'O campo é obrigatório.',
                    })
                    return z.NEVER
                }
            }
        })
    }

    listaPerguntasJSON.filter(p => {
        if(value.idPergunta === p.pei_codigo.toString()){
            const alternativaMarcada = value.alternativas.find(a => a.marcado)

            if(alternativaMarcada){
                const alternativaLiberaPergunta = p.alternativas.find(pa => pa.pal_codigo.toString() === alternativaMarcada.idAlternativa)

                if(alternativaLiberaPergunta?.perguntasVinculadas?.includes(parseInt(value.idPergunta)) && (!value.alternativas.some(a => a.marcado) || value.alternativas.some(a => a.texto === ''))){
                    ctx.addIssue({
                        code: ZodIssueCode.custom,
                        message: 'Você precisa selecionar uma opção.',
                    })
                    return z.NEVER
                }
            }
        }
    })
})

const respostasSchema = z.object({
    respostas: z.array(perguntaSchema)
})

type RespostasSchema = z.infer<typeof respostasSchema>

export function Formulario() {
    const [listaPerguntas, setListaPerguntas] = useState(listaPerguntasJSON) 
    const { control, register, handleSubmit, formState: { errors }, setValue, watch } = useForm<RespostasSchema>({
        resolver: zodResolver(respostasSchema)
    })

    function lidacomEnvioInformacoes(data: RespostasSchema) {
        console.log(data)
    }

    watch((value) => {
        if (!value.respostas) return;
    
        value.respostas.forEach((response) => {
            if (!response?.alternativas) return;
    
            response.alternativas.forEach((alternative) => {
                if (!alternative) return;
                
                if (alternative.marcado) {

                    listaPerguntas.forEach((question) => {

                        const correspondingAlternative = question.alternativas.find(al => al.pal_codigo.toString() === alternative.idAlternativa);

                        if (correspondingAlternative && correspondingAlternative.perguntasVinculadas) {
                            
                            correspondingAlternative.perguntasVinculadas.forEach((linkedQuestionId: number) => {
                                
                                const linkedQuestionIndex = listaPerguntas.findIndex(q => q.pei_codigo === linkedQuestionId);
                                
                                if (linkedQuestionIndex !== -1) {

                                    const linkedQuestion = listaPerguntas[linkedQuestionIndex];
                                    
                                    if (linkedQuestion) {
                                        // Se a pergunta não deve ser exibida, oculta-a
                                        listaPerguntas[linkedQuestionIndex].ehExibida = correspondingAlternative.liberaPergunta;
                                    }
                                }
                            });
                        }
                    });
                }
            });
        });

        setListaPerguntas([...listaPerguntas]); // Atualização final
    });

    return (
        <form style={{ display: "flex", flexDirection: 'column', gap: "2rem" }} onSubmit={handleSubmit(lidacomEnvioInformacoes)}>
            {
                listaPerguntas.map((pergunta, indexPergunta) => {
                    return (
                        <div key={pergunta.pei_codigo + pergunta.descricao}>
                            

                            {
                                pergunta.ehExibida && (
                                    <>
                                    <label htmlFor="">{pergunta.descricao}</label>
                                        {pergunta.tipoPergunta === 'CheckboxList' && (
                                <div>
                                    {pergunta.alternativas.map((alternativa, indexAlternativa) => {
                                        return (
                                            <>
                                                <Controller name={`respostas.${indexPergunta}.alternativas.${indexAlternativa}.marcado`}
                                                    control={control} render={({ field: { name, value, onChange } }) => {
                                                        return (
                                                            <>
                                                                <label htmlFor="" style={{ display: "flex" }}>
                                                                    <input
                                                                        name={name}
                                                                        type="checkbox"
                                                                        checked={value}
                                                                        onChange={onChange}
                                                                    />
                                                                    {alternativa.descricao}
                                                                    {
                                                                        alternativa.ehComposta && (
                                                                            <input
                                                                                type="text"
                                                                                {...register(`respostas.${indexPergunta}.alternativas.${indexAlternativa}.texto`)}
                                                                            />
                                                                        )
                                                                    }
                                                                </label>

                                                            </>
                                                        )
                                                    }} />
                                                <input type="hidden" {...register(`respostas.${indexPergunta}.idPergunta`)} value={pergunta.pei_codigo} />
                                                <input type="hidden" {...register(`respostas.${indexPergunta}.tipoPergunta`)} value={pergunta.tipoPergunta} />
                                                <input
                                                    type="hidden"
                                                    value={alternativa.pal_codigo}
                                                    {...register(`respostas.${indexPergunta}.alternativas.${indexAlternativa}.idAlternativa`)}
                                                />
                                                <input
                                                    type="hidden"
                                                    {...register(`respostas.${indexPergunta}.alternativas.${indexAlternativa}.ehComposta`)}
                                                    value={alternativa.ehComposta.toString()} />
                                            </>
                                        )

                                    })}
                                    <span style={{ color: 'red' }}>{errors.respostas && errors.respostas[indexPergunta]?.root?.message}</span>
                                </div>
                            )}

                            {pergunta.tipoPergunta === 'RadiobuttonList' && (
                                <div>
                                    {pergunta.alternativas.map((alternativa, indexAlternativa) => {
                                        return (
                                            <Controller 
                                                control={control}
                                                name={`respostas.${indexPergunta}`}
                                                render={({ field: { name, value } }) => {
                                                    return (
                                                        <>
                                                        <label>
                                                            <input 
                                                                name={name} 
                                                                type="radio" 
                                                                value={alternativa.pal_codigo} 
                                                                onChange={(e) => {
                                                                    const alternativasAtualizadas = value.alternativas.filter((a) => {
                                                                        if(a.marcado){
                                                                            if(a.idAlternativa !== e.target.value){
                                                                                a.marcado = false
                                                                            }

                                                                            if(a.idAlternativa === e.target.value){
                                                                                a.marcado = true
                                                                            }
                                                                        }
                                                                        else{
                                                                            if(a.idAlternativa === e.target.value){
                                                                                a.marcado = true
                                                                            }
                                                                        }
                                                                
                                                                        return a
                                                                    })

                                                                    setValue(`respostas.${indexPergunta}.alternativas`, alternativasAtualizadas)
                                                                }}
                                                            />
                                                            {alternativa.descricao}
                                                        </label>
                                                        <input 
                                                            type="hidden" 
                                                            {...register(`respostas.${indexPergunta}.alternativas.${indexAlternativa}.marcado`, {
                                                                value: false
                                                            })} 
                                                        />
                                                        <input 
                                                            type="hidden" 
                                                            {...register(`respostas.${indexPergunta}.alternativas.${indexAlternativa}.idAlternativa`)} 
                                                            value={alternativa.pal_codigo}
                                                        />
                                                        <input type="hidden" {...register(`respostas.${indexPergunta}.idPergunta`)} value={pergunta.pei_codigo} />
                                                        <input type="hidden" {...register(`respostas.${indexPergunta}.tipoPergunta`)} value={pergunta.tipoPergunta} />
                                                        <input
                                                        type="hidden"
                                                        {...register(`respostas.${indexPergunta}.alternativas.${indexAlternativa}.ehComposta`)}
                                                        value={alternativa.ehComposta.toString()} />
                                                        </>
                                                    )
                                                }}
                                            />
                                        )
                                    })}
                                    <span style={{ color: 'red' }}>{errors.respostas && errors.respostas[indexPergunta]?.root?.message}</span>
                                </div>
                            )}

                            {pergunta.tipoPergunta === 'TextBox' && (
                                <div>
                                    {pergunta.alternativas.map((alternativa, indexAlternativa) => {
                                        return (
                                            <>

                                                <input
                                                    type="text"
                                                    {...register(`respostas.${indexPergunta}.alternativas.${indexAlternativa}.texto`)}
                                                />
                                                <input
                                                    type="hidden"
                                                    value={alternativa.pal_codigo}
                                                    {...register(`respostas.${indexPergunta}.alternativas.${indexAlternativa}.idAlternativa`)}
                                                />
                                                <input type="hidden" {...register(`respostas.${indexPergunta}.idPergunta`)} value={pergunta.pei_codigo} />
                                                <input type="hidden" {...register(`respostas.${indexPergunta}.tipoPergunta`)} value={pergunta.tipoPergunta} />
                                                <input
                                                    type="hidden"
                                                    {...register(`respostas.${indexPergunta}.alternativas.${indexAlternativa}.ehComposta`)}
                                                    value={alternativa.ehComposta.toString()} />
                                            </>
                                        )
                                    })}
                                    <span style={{ color: 'red' }}>{errors.respostas && errors.respostas[indexPergunta]?.root?.message}</span>
                                </div>
                            )}
                                    </>
                                )
                            }

                        </div>
                    )
                })
            }
            <div>
                <button type="submit">Enviar</button>
            </div>
        </form>
    )
}