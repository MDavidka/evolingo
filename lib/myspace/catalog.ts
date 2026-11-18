export const catalog = [
{id:'notes',name:'Notes',description:'Private notes saved per installation.',version:'1.0.0',permissions:['storage:app']},
{id:'focus-board',name:'Focus Board',description:'Tasks, groups, priorities and search.',version:'1.0.0',permissions:['storage:app']}
,{id:'api-inspector',name:'API Inspector',description:'Inspect real responses from approved public APIs.',version:'1.0.0',permissions:['storage:app','network:approved']}
] as const
export function validApp(id:unknown):id is 'notes'|'focus-board'|'api-inspector'{return id==='notes'||id==='focus-board'||id==='api-inspector'}
