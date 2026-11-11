不止是可以把文件作为最终结果，也可以是求值的

对于每个task，我希望你修改原有的prompt，不再是对于具体步骤和工具调用都说得非常明确，而是明确在需求上：
对任务要求的表述是清晰的，如果符合prompt的要求去做，就一定能确定地达到eval的标准。确保在仅仅读取prompt给出的需求并做到后，就可以明确导向理想中的结果，在eval的每个标准都能通过。
保证这个之后，就没必要进一步给出引导（从而降低这个测试的难度），具体的提示代码更是不要出现。对于那些为了确保按prompt做能明确达到eval标准、防止模糊而给出操作步骤的prompt，将其用对需求描述的限制、明确，来代替。
还有一点，注意一下别犯：对于task_T开头的由于partial observation而必须多轮的任务，尽量少在prompt中提及模型观察交互就能得到的，有关初始文件内容的具体信息。保证需求和限制清晰，确定导向合格eval内容的条件下，尽量减少多余的信息，让题目有更大的难度，以及更有必要的多轮交互。
据此修改每个任务。如果存在某些任务，你觉得仅仅修改prompt不如把任务内容整体做改变，也可以按照上述需求把task里的prompt,initial blend,eval修改。

现在我们的任务类型是零散不系统的，各种需求都有，但，不知道是否覆盖全任务类型+没有对任务类型的大致分类。由于这个项目最终是要做一个benchmark，把每个prompt.md+initial blend+eval.py作为一个评测点，对LLM使用命令行进行blender的工业任务能力进行评估，我们希望覆盖的任务类型是非常广的，包含各种各样类型的任务。
据此，你对blender这款软件处理的各种类型任务进行全面列举设计，先不造出完整task文件夹而是描述一下每个任务的需求，总量大概200条。保证彼此间的差异和多样性，尽量让类型相似的任务做的事情也是本质不同的，而不是仅仅换个参数这类表层差异。任务的设计应该具有难度，在做到之前所说的，prompt能明确指向通过评估的结果的条件下，尽量让操作复杂、长线、涉及多轮交互、困难。
进行完这一全面丰富的任务设计以后，你大致对这些任务进行一个分类，分出每个任务大致属于什么类型的。
把上述所有结果写在一个.md文件中，放在engi-world目录下。

现在简单任务已经实现，我们要设计更复杂、困难、长线、需要多轮交互的操作。它们不仅仅是给出指令生成合格的.step文件，还几乎都需要基于已有的.step文件作为基础去操作，需求也是说基于已有的文件进行某某操作。需要多轮交互的原因，一是任务本身很复杂困难，做不到仅仅写一次代码运行生成就完事了；二是这个任务是partial observation的，也就是说我们的任务几乎都有的初始的.step文件里面的很多信息，是模型仅仅读prompt不能知道的，需要自己去看初始文件的内容，再去决策和进行下一步操作。
在实现的时候，每个task文件夹中包含用于描述任务需求的prompt.md，包含所有初始的.step文件的文件夹，以及对最终结果.step文件的评估代码eval.py. prompt.md对任务要求的表述是清晰的，如果符合prompt的要求去做，就一定能确定地达到eval的标准。确保在仅仅读取prompt给出的需求并做到后，就可以明确导向理想中的结果，在eval的每个标准都能通过。保证需求和限制清晰，确定导向合格eval内容的条件下，尽量减少多余的信息给出，让题目有更大的难度，以及更有必要的多轮交互。

现在，在Hard的50条中挑选10个，生成完整的task文件夹，命名规则是精简后的新命名，都放在engi-world/final-tasks/-C中。
每个文件夹的实验都只包含需求描述prompt.md，已有文件输入initial_blend文件夹，和对生成的.blend文件进行评估的eval.py。
prompt.md对任务要求的表述是清晰的，读取其中的需求并做到后，就可以明确导向理想中的结果，eval的每个标准都能通过。
在这种保证需求和限制清晰、确定导向合格eval内容的条件下：尽量减少多余的信息给出，从而让题目有更大的难度以及更有必要的多轮交互；且任务的设计应该尽可能复杂、长线、需要多轮交互、困难。
如果有时候你觉得自己可以修改task_design_new.md的任务描述来更好地达成上述要求，也是可以的。

是的，所以模型完全没必要知道tolerance是多少，直接完成需求一定能符合（了解以后反而给了钻空子的机会）
所以，修改10个task的prompt，删掉里面出现的所有涉及告知eval时的tolerance设置的内容。
而且，现在prompt里面有非常结构化的input,deliverable,geometric requirements, scene requirement，没必要这样子分类，将其做成一个更整体、连贯的对需求的表述。保证改写后的内容和原来内容传达的信息是等价的，仅仅是改变表述，从而我们已有的答案和eval.py都是正确的。和之前一样要满足prompt.md明确导向符合eval标准的结果，并且在此条件下尽可能少地传达额外信息和提示，保证任务的难度。

目前的任务设计是task_design_mew.md，我们要修改一下100条任务的设计。
当前所有task都是我们人工设计的，但是我们希望这个benchmark的70%内容是和已有的内容有关系的，也就是这些tasks是有来源的、是可被称为我们收集的，剩下的30%才是完全自主设计。
我们先整体对100条修改，后面再考虑分medium和hard的事情。修改方案是，对于G,H,Q这三类我们认为比较好的类型，保留15条最有难度、吃多轮交互、长线、复杂的。剩下的15条是给其它类别的，选择的标准和上面所说的一样。在final_task里面已经完成的，都保留。
对于剩下需要有来源的题目，你需要详尽地上网搜索blender的3D建模任务，例如（我的列举仅供举例，你去充分搜索有用信息来源）文档、文献、教材习题、技术报告等等。记住他们仅仅是为了作为我们benchmark的来源，具体的任务设置和细节你可以在上面自由地进行修改，目的是让任务有难度、吃多轮交互、长线、复杂。稍微注意一下后续我们做任务的时候，是希望指令能明确地导向通过评测的结果文件，所以不要弄怎么加限制都无法客观评测的过于宽泛的任务。
把这些内容加上保留的30条，整体上看，我们希望任务是具有多样性的——全面地包含blender这款软件的实际应用场景，各个样本测试的内容都具有一定程度的本质不同（而不仅仅是换个数这种）
结果保存在task_design_withsource.md

目前的任务设计是task_catalog.md，我们要修改一下100条任务的设计。
当前所有task都是我们人工设计的，但是我们希望这个benchmark的70%内容是和已有的内容有关系的，也就是这些tasks是有来源的、是可被称为我们收集的，剩下的30%才是完全自主设计。
修改方案是，先在各类别中保留共30条最有难度、吃多轮交互、长线、复杂的。在tasks里面已经完成的，都保留。
对于剩下需要有来源的题目，你需要详尽地上网搜索KiCad的任务，例如（我的列举仅供举例，你去充分搜索有用信息来源）文档、文献、教材习题、技术报告等等。记住他们仅仅是为了作为我们benchmark的来源，具体的任务设置和细节你可以在上面自由地进行修改，目的是让任务有难度、吃多轮交互、长线、复杂。稍微注意一下后续我们做任务的时候，是希望指令能明确地导向通过评测的结果文件，所以不要弄怎么加限制都无法客观评测的过于宽泛的任务。
把这些内容加上保留的30条，整体上看，我们希望任务是具有多样性的——全面地包含KiCAD这款软件的实际应用场景，各个样本测试的内容都具有一定程度的本质不同（而不仅仅是换个数这种）
结果保存在task_catalog_withsource.md

是的，你对 zbursh 这款软件常处理的各种类型任务进行全面上网搜索，例如（我的列举仅供举例，你去充分搜索有用信息来源）文档、文献、教材习题、技术报告等等。记住他们仅仅是为了作为我们benchmark的来源，具体的任务设置和细节你可以在上面自由地进行修改。先不造出完整 task 文件夹而是描述一下每个任务的需求，总量35条。保证彼此间的差异和多样性，尽量让类型相似的任务做的事情也是本质不同的，而不是仅仅换个参数这类表层差异。在做到 prompt 能明确指向通过评估的结果的条件下，任务的设计大概是比最基本的操作稍微复杂一些的程度。
剩下的15条由你自行设计，用来覆盖前面35条没有顾及到的常用任务。
进行完这一全面丰富的任务设计以后，你大致对这些任务进行一个分类，分出每个任务大致属于什么类型的。
把上述所有结果写在一个.md文件中，放在/home/zangyihe/zbrush目录下。

任务的设计应该具有难度，尽量让操作复杂、长线、涉及多轮交互、困难。
在里面抽取五个任务，对于这五个，把完整task文件夹做出来，放在engi-world-eda/tasks目录下。

现在，挑选5个，生成完整的task文件夹，都放在zbrush/tasks中。
每个文件夹的实验都只包含需求描述prompt.json，已有文件输入initial_files文件夹，和对生成的文件进行评估的eval.py（要写调用整个评测的函数入口）。
instruction对任务要求的表述是清晰的，理论上被测者读取后就能理解任务内容，做到里面的要求后即可明确导向预期的结果，通过eval.py
initial_files中的文件和预期的输出文件都使用zbrush最常用的原生格式。
如果有时候你觉得自己可以修改task_design_new.md的任务描述来更好地达成上述要求，也是可以的。
并且，根据format.json的指导，对每个任务生成一个.json文件，放在zbrush/jsons中

把这100个任务所属的任务类型大致做一个分类，补充在task_catalog_withsource.md后面。
同时，把这100个任务根据是否困难、吃多轮交互、复杂分成类似原来medium和hard两类，每类50条。困难的部分记作C，剩余的记作V。

对于已经完成的5个任务，我们要修改文件夹中的内容格式，并且对于每个任务，设置一个json文件。

文件夹中的修改是：
把initial改名成initial_files；
在eval.py中加上调用整个评测的函数入口；
把prompt.md变成非markdown的单纯文本，改为保存成prompt.json，里面是{"prompt":"这里放文本内容"}。注意保证从markdown格式变成单纯文本后保持意思完全不变，仍然是可以从prompt明确导向符合eval标准的结果。

之后是有关json文件的事情。每个任务都有对应的json文件，保存为kicad-[编号].json放在final_jsons文件夹中。这个json文件的格式和内容见format.json。

首先修改你的整个任务设计，让这100条数据真正涵盖kicad的大部分使用场景。
新的任务设计，同样是需要对 kicad 这款软件常处理的各种类型任务进行全面上网搜索，例如（我的列举仅供举例，你去充分搜索有用信息来源）文档、文献、教材习题、技术报告等等。记住他们仅仅是为了作为我们 benchmark 的来源，具体的任务设置和细节你可以在上面自由地进行修改。先不造出完整 task 文件夹而是描述一下每个任务的需求，总量70条。保证彼此间的差异和多样性，尽量让类型相似的任务做的事情也是本质不同的，而不是仅仅换个参数这类表层差异。在做到 prompt 能明确指向通过评估的结果的条件下，任务的设计应该具有难度，尽量让操作复杂、长线、涉及多轮交互、困难。
未来实现时，涉及的文件类型应该是kicad最常用的格式，所以不要为了适配inital_files全部为.step文件而限制任务设计。
剩下的30条由你自行设计，用来覆盖前面70条没有顾及到的常用任务。仍然是尽量让类型相似的任务做的事情也是本质不同的，而不是仅仅换个参数这类表层差异，并且在做到 prompt 能明确指向通过评估的结果的条件下，任务的设计应该具有难度，尽量让操作复杂、长线、涉及多轮交互、困难。

---

我们要把task_sketchup.md中设计的 80 个对于 sketchup 这款软件的任务文件夹都做出来。
每个文件夹里有进行测试时给到被测者的初始文件夹init_file（内含所有初始文件）（如果任务涉及初始文件的话），评估结果文件合格/不合格的eval.py（包含调用整个评测的函数入口），按照D:\localwork\altium-designer\format.json格式填入信息的task-xx.json（里面的instruction是很重要的），包含正确答案文件的ground_truth文件夹和里面的已经测试过能通过eval.py的答案文件answer.(后缀名)，以及_internal文件夹，包含制作init_file中的文件和answer文件的代码。

instruction对任务要求的表述应该是清晰的，读取其中的需求并做到后，就可以明确导向通过评测的结果。
init_file中的文件应该符合prompt的描述。
所有任务都应该是可以被完成的。

属于前30条的任务，被测者要使用命令行完成。在保证instruction能确定地导向通过评估的结果的条件下，尽量减少多余的信息给出，从而让题目有更大的难度以及更有必要的多轮交互。这部分任务的设计应该具有难度，尽可能让操作复杂、长线、涉及多轮交互、困难。
属于后30条的任务，被测者要在软件中进行GUI交互。这些任务应该比最基本的操作更复杂和困难。

为了做成更好的任务文件夹，你可以修改task.md中的任务设定或细节。

在这些条件下，尽量减少多余的信息给出，从而让题目有更大的难度以及更有必要的多轮交互。任务应该尽可能复杂、长线、需要多轮交互、困难。对此，你可以修改task_design_v3.md中的任务设定或添加细节。

---

这里是 D:\localwork\altium-designer 文件夹，我们要做一个 benchmark，评测 AI Agent 能否完成 Altium Designer 这一软件处理的任务。我们首先要设计50个任务，后续这些任务会被做成Benchmark题目。

请你对 Eagle 这款软件常处理的各种类型任务进行全面上网搜索，例如（我的列举仅供举例，你去充分搜索有用信息来源）文档、文献、教材习题、技术报告等等。记住他们仅仅是为了作为我们 benchmark 的来源，具体的任务设置和细节你可以在上面自由地进行修改，总量25条。

保证彼此间的差异和多样性，尽量让类型相似的任务做的事情也是本质不同的，而不是仅仅换个参数这类表层差异。同时，确保benchmark任务设计的覆盖性，让这25条比较好地覆盖了常用的多种操作。

这些任务应该比最基本的操作更复杂和困难。它们可以是没有任何初始文件的任务，也可以是含有初始文件，需要模型阅读或在上面编辑的。

把设计好的任务写在eagle/task.md中。

---

现在大部分任务是缺少source的。请对 eagle 这款软件常处理的各种类型任务进行全面上网搜索，例如（我的列举仅供举例，你去充分搜索有用信息来源）文档、文献、教材习题、技术报告等等，找到与我们设计的任务考点内容一致的来源（已有的不用再找），写在json文件的source里面。我们的一些任务可能比较复杂，或者因为什么原因从而很难有完美契合的，但也尽量让来源与我们的任务比较贴合。只有那些明显不能找出来源的，仍然写human_craft，这些无来源的可以有10条。

我要再设计25个任务，写在task.md后面。请你对 Eagle 这款软件常处理的各种类型任务进行全面上网搜索，例如（我的列举仅供举例，你去充分搜索有用信息来源）文档、文献、教材习题、技术报告等等。记住他们仅仅是为了作为我们 benchmark 的来源，具体的任务设置和细节你可以在上面自由地进行修改，但是每道题的来源要记录下来。

连同已有的41条一起，保证彼此间的差异和多样性，尽量让类型相似的任务做的事情也是本质不同的，而不是仅仅换个参数这类表层差异。同时，确保benchmark任务设计的覆盖性，让这总共的50条（在做不到limitations任务的情况下尽可能）比较好地覆盖了常用的多种操作。

这些任务应该比最基本的操作更复杂和困难。它们可以是没有任何初始文件的任务，也可以是含有初始文件，需要模型阅读或在上面编辑的。

---

我们的这个benchmark考察的是模型在软件中进行GUI操作的能力，要去评测通过GUI操作得到的结果。

所以，先把第一类的考点从命令行操作变成GUI操作，评测内容从“写出的代码对不对”变成“运行GUI操作得到的结果文件能不能符合标准”。
对于第二类，减少重复次数，不考察使用命令行操作完成批量处理的能力，只考察里面的GUI操作，同样，评测要从“写出的代码对不对”变成“运行GUI操作得到的结果文件能不能符合标准”。
第三类，你要设计出相同数量的新任务，覆盖它们。这些新任务也是要有来源的，请你对 Eagle 这款软件常处理的各种类型任务进行全面上网搜索，例如（我的列举仅供举例，你去充分搜索有用信息来源）文档、文献、教材习题、技术报告等等。记住他们仅仅是为了作为我们 benchmark 的来源，具体的任务设置和细节你可以在上面自由地进行修改，但是每道题的来源要记录下来。

这样，我们就得到了新的50条任务，其中有40条是原本答案为answer.py的任务修改或重做而来的，它们的任务文件夹后续会被重新实现，去覆盖原来的。

对于第一、二类进行修改而不是重新生成的任务，如果我们的修改导致考点重复了（彼此重复，以及与第三类新做的+保留的十条任务重复），你可以在操作评测方式和目标之外再去修改任务内容。如果你的修改让原来的来源和这道题已经没什么关系了，就把这道题的来源改成human_craft. 

总的50条应该保证彼此间的差异和多样性，尽量让类型相似的任务做的事情也是本质不同的，而不是仅仅换个参数这类表层差异。同时，确保benchmark任务设计的覆盖性，让不同任务比较好地覆盖了常用的多种操作。

未来实现的时候，我们去调用eval.py进行评测的目标文件应该是GUI操作能自然而原生地得到的。    

---

在~/Engiworld/engiworld_eda/task里面加上blender_task_overview.md，在这个文件里对我们设计出的100个任务进行一个总览。基本上使用~/engi-world/task_design_v3.md的内容即可，你主要就是修饰一下语言，让这个文件变成比较好的对所有任务的总览文件。
最后要加上limitations部分，讲述任务设计没有覆盖哪些类型。实事求是地讲即可，不用生硬地例举出很多没有覆盖（而实际上可能并不那么重要）的task. 

---

我们要做一个 benchmark，评测 AI Agent 能否完成 Altium Designer 这一软件处理的任务。

我们首先要设计50个任务，后续它们会被做成Benchmark题目，将包含：

告诉被测者要做什么的任务指令
评估被测者做好的文件结果的评估脚本
对于有初始文件的任务，会有初始文件
（这三样最重要，未来实现时，task文件夹里还有别的东西）

目前不做出每个任务文件夹，而是先设计所有任务。请你对这款软件常处理的各种类型任务进行全面详尽的上网搜索，例如（我的列举仅供举例，你去充分搜索有用信息来源）文档、文献、教材习题、技术报告等等，由此设计出50条任务。记住他们仅仅是为了作为我们 benchmark 的来源，具体的任务设置和细节你可以在上面自由地进行修改，但是每个任务的来源应该被记录下来。

保证彼此间的差异和多样性，尽量让类型相似的任务做的事情也是本质不同的，而不是仅仅换个参数这类表层差异。
同时，确保benchmark任务设计的覆盖性，让前25条和后25条都比较好地覆盖了常用的多种操作。

前25条任务，被测者要使用命令行完成。这部分任务的设计应该具有难度，尽可能让操作复杂、长线、涉及多轮交互、困难。
后25条，被测者要在软件中进行GUI交互。这些任务应该比最基本的操作更复杂和困难。

任务（两部分都是）可以是没有任何初始文件的任务，也可以是含有初始文件，需要模型阅读或在上面编辑的。
而且，评测一个任务是否通过，应该去评估操作软件得到的文件结果(它们应当是使用这款软件时常用的原生格式)，用评估脚本检查做好的文件是否满足条件。

把设计好的任务写在D:\localwork\altium-designer\task.md中。

---

类似地，把eagle的任务（~/Engiworld/engiworld_eda/task/task-v/eagle中的50条）分成两个split.

前25条任务，被测者要使用命令行完成。这部分任务应该具有难度，尽可能让操作复杂、长线、涉及多轮交互、困难。
后25条，被测者要在软件中进行GUI交互。这些任务应该比最基本的操作更复杂和困难。

仔细权衡，分好，后25条继续保留在~/Engiworld/engiworld_eda/task/task-v/eagle中（重排序号为26-50），后25条移动到~/Engiworld/engiworld_eda/task/task-c/eagle中（重排序号为1-25）。

---

现在engiworld_eda里，有一些任务并不需要软件的参与/有一些task-v的任务不方便用GUI操作去完成。

所以，请你遍历所有engiworld_eda任务，1.分析每个任务的操作过程需不需要软件的参与，

比如altium designer有一个任务是读取并编辑PrjPcb文件，而这种格式实际上用什么文本编辑器都能读写，因此不需要软件其实就能操作。
这个例子只是单纯举例，对于每个任务你应当分析它的执行过程需不需要软件参与。如果有些时候用你的现有知识不能确定，请上网查询权威指导。不用非得鸡蛋里挑骨头，如果需要用到软件就不用管。只有的确不需要软件就能完成的task需要你记一下。

2.分析engiworld_eda的所有task-v部分的任务是否方便用GUI操作去完成，

比如altium disigner的task-v部分的task-29，要求导出csv，但是导出的东西不是使用软件GUI操作方便完成的（如report功能）而是考察其它的csv处理能力，因此用GUI操作其实很难完成。
这个例子只是单纯举例，对于每个任务你应当分析它的执行过程方不方便用GUI完成。如果有些时候用你的现有知识不能确定，请上网查询权威指导。
不用非得鸡蛋里挑骨头，如果用GUI能做到就不用管。只有的确不能用对应软件的GUI操作就能完成的task需要你记一下。

结束后，把所有需要标记的任务给我列出来。

---

我看的是每个任务 eval.py 实际检查什么，不是只按 instruction 标题或文件扩展名猜。下面是保守标记结果；我没有把所有“原生文件其实是文本”的任务一股脑都算进去，只记那些执行路径明显不依赖软件，或 task-v 明显不适合 GUI 的。

  不需要软件参与

  - altium-designer: task-c/task-01..25，task-v/task-26..50。原因是这些任务的 eval.py 基本都在检查 json/csv/txt 或 INI/文本化的原生文件结构；即使有 .PrjPcb/.OutJob/.SchDot/.PCBDwf/.Harness，评测也是按文本结构比对，不依赖软件内部状态。
  - cadence-orcad: task-c/task-02,04,06,07,09,11-30，task-v/task-51-60。这些任务本质上是基于 *.out/*.cir/*.csv/*.json/*.txt/*.art/*.pad 等现成文本/表格做报告、清单、配置生成，不需要真的在 Capture 里交互。
  - kicad: task-c/task-07,08,11,12,13,15,16,18,20,21,22,23,25，task-v/task-26,30,31,32,44。这些任务要么是在改 kicad_pro/kicad_sym/kicad_mod/kicad_dru 这类开放文本格式，要么是在生成报表/打包/图结构，不是典型原理图/PCB GUI 操作。
  - eagle: task-c/task-13，task-v/task-28,35。这几个都是直接写 .dru 规则文本，eval.py 也是按 key=value 文本解析检查。

  task-v 中不方便用 GUI 完成

  - altium-designer: task-26,27,28,29,31,32,41,42,43,44,47,49。这些任务要求额外产出 hierarchy_export.txt、part_dump.csv、symbol_dump.csv、harness_dump.json、compiled_refs.txt、signals.Harness、
    net_lengths.csv、purchase.csv、consolidated.csv 等非 Altium 常规 GUI 终态，或直接按 json/csv 规格生成模板/结构文件。
  - cadence-orcad: task-49,50,51-60。49/50 不是标准 Capture GUI 的原生 netlist/BOM 结果，而是自定义简化文本和按 variant 精确切分的 CSV；51-60 基本都是纯文本/表格到 json/xml/pad/csv 的生成题。
  - kicad: task-31,44。31 要按 IPC 公式批量生成 3 个 footprint 变体；44 要在 board.kicad_pro 里写入带 waiver_expiry 的 exclusion 元数据，这不是 KiCad GUI 里自然的完成路径。
  - eagle: task-28,35。这两个都是在直接生成/改写 .dru 规则文本，不是 EAGLE GUI 的自然交互终态。

  边界项我查了官方资料后才定：KiCad task-44 参考 KiCad 官方 DRC 文档里 GUI 只有 exclusion/comment 工作流，而没有 waiver_expiry 这类元数据入口；OrCAD task-49/50 参考 Cadence 官方对标准 netlist/BOM 导出的说
  明，所以我把它们归到“GUI 不方便”，但没有归到“完全不需要软件”。参考链接：KiCad DRC exclusions (https://docs.kicad.org/master/en/pcbnew/pcbnew_inspecting.html)、Cadence netlist export
  (https://resources.pcb.cadence.com/blog/2024-how-to-generate-a-netlist-in-orcad-x)、Cadence BOM export (https://resources.pcb.cadence.com/blog/2024-how-to-generate-a-bom-in-orcad-x)。

---

那么，对于 kicad 的上述不太好的tasks，我们要将其修改。
对于实际上不需要使用软件的tasks/task-v中的不方便在GUI操作中完成的tasks，我们要修改任务的要求，变动任务文件夹中的内容，让其真正评测完成该软件常处理的任务的能力/让其评估的结果文件是方便在GUI中操作得到的。

最好能从评测形式上解决问题，比如在同一个任务内容上，让文件是必须用软件才能正确打开/编辑/创建的，从而解决任务实际不需要使用软件的问题；或者让输出的格式是软件支持的格式，从而让GUI操作很自然而方便地处理。
这可能涉及修改评估条件，这些时候要改python脚本；同时也可能涉及修改初始文件和标准答案内容，这些文件里有的需要用命令行驱动本机安装的软件去生成文件。有关后者这件事的教程，见D:/localwork/altium-designer/altium-designer-operation.md和 D:/localwork/orcad/orcad-operation.md。

如果不能，再进行更进一步的修改，如修改任务内容和任务逻辑。
在这种情况下，1.如果修改后的任务已经和原有source显著地有巨大的差异，请你上网搜索例如（我的列举仅供举例，你去充分搜索有用信息来源）文档、文献、教材习题、技术报告等等来源，把与我们内容相关的来源作为修改后任务的source；同时，你也可以利用上网搜索去得知一个软件常处理的任务有哪些，从而更好地设计修改后的任务。2.修改以后，对所有任务总体来说，要保证彼此间的差异和多样性；同时，确保覆盖性，让task-c和task-v都比较好地覆盖了常用的多种操作。3.任务内容应该遵循以下原则：task-c的任务，被测者要使用命令行完成，这部分任务的设计应该具有难度，尽可能让操作复杂、长线、涉及多轮交互、困难；task-v的任务，被测者要在软件中进行GUI交互。这些任务应该比最基本的操作更复杂和困难。

由于要处理的任务很多，你可以使用多个subagent去并行增加效率。给它们的prompt要传达好，我们是因为“任务实际不需要使用软件/task-v的任务不方便在GUI操作中完成”所以去修改task，并且讲清楚我们的“先考虑变形式再考虑变内容”的思路，以及上述的对于两种修改方式的详细指导。

![image-20260427173254930](C:\Users\HUAWEI\AppData\Roaming\Typora\typora-user-images\image-20260427173254930.png)

---

第一个针对agent的verified的工业软件交互评测bench，包括了30+ 工业软件（CAD、CAE等），由领域专家对成功条件标注（例如满足某些物理、数学约束） ，考虑模型的软件工程、领域知识（物理、数学、工程）、推理与空间理解、长程理解、多模态交互等能力。 由真实环境和领域知识的verify function构成，包括gui、cli两种具体的场景。

尽管大语言模型智能体在通用软件操作与数据工作流中展现出强大潜力，但其在复杂工业工程环境中的能力仍未得到充分探索。为此，我们提出了 EngiWorld，首个同时覆盖 GUI 与 CLI 交互范式的工业软件智能体评测基准。不同于现有侧重通用数字工作流的基准，EngiWorld 聚焦于以工程产物为中心（artifact-centric）的专业任务，并具备四个核心特征：真实性（源于真实工程流程与专业软件生态）、长程性、领域性，以及原生多轮交互（迭代过程由渲染器输出、仿真收敛曲线、ERC/DRC 违规报告等领域工具反馈直接驱动）。此外，针对工业产物开放且非唯一的特性，我们提出了一套基于领域验证器（Verifier-grounded）的评测方法学，通过几何精度验证、物理求解与规则核查取代了传统的表层状态匹配。EngiWorld 不仅揭示了现有智能体的能力鸿沟，更为迈向工业级专业智能体提供了严谨的评测框架。

![image-20260427235233980](C:\Users\HUAWEI\AppData\Roaming\Typora\typora-user-images\image-20260427235233980.png)

---

现在我要你在engiworld_eda和engiworld_3dmodeling中过一遍所有任务的json文件，将其修改为新形式。D:\localwork\reference.json是一个例子，其中各项的含义解读和填法如下：

1. id为 模态(c/v)-软件(全小写，如果有空格，中间用-连接)-task(就这四个字母)-编号-ubuntu(就这六个字母)

2. snapshot先都空着

3. 所有的instruction里，告知被测者初始文件或指定输出结果文件，文件名前面都要加上绝对路径/home/user/Desktop/（即使是一些特别的task，被测者的输出涉及新建文件夹，也是同样在文件夹名前面加上这一绝对路径），比如“在/home/user/Desktop/abc.xyz中xxx的基础上创建...”或“有关xxx的信息在/home/user/Desktop/aaa.bbb”或“把构建好的结果保存在/home/user/Desktop/ccc.ddd”(我这三个指导被测者去看初始文件/输出文件的表述仅仅是举例，你要根据实际任务写恰当的instruction. 我强调的事情只是，初始文件和输出在Instruction的表述里是要带着绝对路径/home/user/Desktop/出现的)
   （reference.json给的instruction例子是freecad，不是我们的软件，但这不重要）

4. **任何instruction中都不要出现合理描述任务需求以外的内容。比如每个任务，被测者需要看的文件（如果有）就只有初始文件，如果在instruction中让被测者去看_internal/中的东西或者额外文件如D:/localwork/orcad/orcad-operation.md就是不对的。类似地，在讲清楚任务内容后，又给出具体的操作步骤指导、告诉被测者使用什么工具什么按键之类的，也是不对的。**
   **众多项修改中，其它都主要是格式处理，只有这个涉及你对具体任务指令的理解，知道这个任务是什么+什么Instruction足以让被测者理解后即可导向符合评估的结果。你应该花更大的精力来弄好这一项改动。**

5. source保留之前的不用变

6. 有关"config"，我们是先把所有初始文件写进去：每一个初始文件都需要一个

   {

   ​    "type": "upload_file",（固定写这个）

   ​    "parameters": {

   ​     "files": [

   ​      {

   ​       "local_path": "task-13/init_file/input.step",（task-编号/init_file/文件）

   ​       "path": "/home/user/Desktop/input.step"（和在Instruction里面的一样，用绝对路径写的初始文件，也就是把文件放在/home/user/Desktop/下然后填在此处）

   ​      }

   ​     ]

   ​    }

      },

   有x个初始文件就弄x个上面的{},并列放在"config"下，都弄好后，config里还要加一个{

   ​    "type": "launch",

   ​    "parameters": {

   ​     "command": [

   ​     ]

   ​    }

      }
   固定这么写即可，command留空。

7. "trajectory": "trajectories/",固定这么写

8. "related_apps": ["kicad"],写当前任务属于的应用，全小写，空格用-

9. "evaluator": {

      "postconfig": [

   ​    {

   ​     "type": "upload_file",

   ​     "parameters": {

   ​      "files": [

   ​       {

   ​        "local_path": "task-13/eval.py",

   ​        "path": "/home/user/Desktop/eval.py"

   ​       }

   ​      ]

   ​     }

   ​    }

      ],

   "func": "exact_match",

      "result": {

   ​    "type": "vm_command_line",

   ​    "command": "python /home/user/Desktop/eval.py",

   ​    "shell": "true"

      },

      "expected": {

   ​    "type": "rule",

   ​    "rules": {

   ​     "expected": "true\r\n"

   ​    }

      }

     },

     "proxy": false,

     "fixed_ip": false,

     "possibility_of_env_change": "low"

    }

   这里只有local_path，也即"task-xx/eval.py"随不同任务变化，仅仅变编号。

我们在json里，有的路径是带有/home/user/Desktop前缀的对吧？
对于altium designer, orcad, sketchup, zbrush，这四类的json，这一前缀要变成C:\\Users\\User\\Desktop\。并且，这四类的json中的任何路径，都不用/，而是\\作为分隔。

---

现在我需要你看一下engiworld_3dmodeling

请先明确理解这里每个软件主要处理的任务，可以上网搜索。

然后看一下目前已经实现的每个任务的逻辑，评估一下目前的任务设计是否比较好地覆盖了每个软件的常用任务。

---

在到时候运行的机器上，我们只有刚安装好的软件。所以，不能让你的评测是基于在安装好的软件的基础上再做的本地的东西（比如某本地路径的worker）。你只能知道软件的路径，然后调用软件(如果需要的话)完成评测，像worker的逻辑可以在代码内容中去执行或在运行代码时创建worker之类的。总之，初始时你有的就只是已知安装路径的软件。
对此，保证评测逻辑完全不变的情况下，修改所有在拥有安装好的软件也不能直接评测(比如评测逻辑基于本机路径worker)的eval.py。
而且，所有在评测时需要调用软件的（上面的需要改的是它的一个子集），都把需要的软件路径作为大写字母命名的变量写在代码前面，并且值目前都填在本机上对应的路径（如果你清楚目前版本软件在安装路径下各组建都位于什么子目录下，你可以只要求一个变量，软件安装路径；如果你需要多个目录，可以在前面命名多个变量，比如本机的ORCAD在D:\orcad，工作目录在D:\orcad_work，你就可以写ORCAD_PATH="D:\orcad";ORCAD_WORK_PATH="D:\orcad_work"，后面运行评测逻辑时调用（我不知道你需不需要这两个目录，只是单纯举例，告诉你，如果需要多个目录，可以写多个变量））

---

对于全部七个软件，各自总结一下：

需要pip install什么才能运行全部该软件任务的eval.py；
全部该软件任务的eval.py写在脚本前面位置的路径变量都有哪些

---

把altium designer, sketchup, zbrush, orcad这四个软件的任务的eval.py中，/home/user/Desktop都换成C:\\Users\\User\\Desktop，并且路径都用\\而不是/分隔

---

altium designer 无
eagle 无
zbrush 无
kicad KICAD_CLI_PATH='/usr/bin/kicad-cli'
blender BLENDER_PATH=C:\\Program Files\\Blender Foundation\\Blender5.1\\blender.exe
sketchup  

SKETCHUP_INSTALL_PATH = r"C:\\Program Files\\SketchUp\\SketchUp 2026\\SketchUp"
SKETCHUP_EXE_PATH = r"C:\\Program Files\\SketchUp\\SketchUp 2026\\SketchUp\SketchUp.exe"
SKETCHUP_TEMPLATE_PATH = r"C:\\Program Files\\SketchUp\\SketchUp 2026\\SketchUp\resources\en-US\Templates\Temp01a - Simple.skp"

C:\\Program Files\\Altium\\AD26\\X2.EXE
C:\\Program Files\\SketchUp\\SketchUp 2026\\SketchUp\\SketchUp.exe
C:\\Program Files\\Maxon ZBrush 2026\\Zbrush.exe

---

现在我们要处理的任务都转在了D:\localwork\Engiworld\task\里面。我们先看task\task-v，里面我们负责的软件有altium designer,blender,eagle,kicad,sketchup,zbrush.现在要进行这几个操作：

  1.altium designer, blender, sketchup, zbrush这四个软件的测评是在windows上完成的。所以，把eval.py中所有/home/usr/Desktop这一路径前缀都改成C:\\Users\\Administrator\\Desktop（注意不是User,而是Adiministrator了），并且这些软件任务的eval.py的路径分隔符应该是\\，如果有/，要改一下，注意别把非路径的/也改坏了。

  2.eval.py中涉及软件路径的，不让环境侧的人改了，我们来改。有kicad，sketchup, blender这三个软件，需要改的变量有
  KICAD_CLI_PATH="/usr/bin/kicad-cli"

  SKETCHUP_INSTALL_PATH = r"C:\Program Files\SketchUp\SketchUp 2026\SketchUp"
  SKETCHUP_EXE_PATH = r"C:\Program Files\SketchUp\SketchUp 2026\SketchUp\SketchUp.exe"
  SKETCHUP_TEMPLATE_PATH = r"C:\Program Files\SketchUp\SketchUp 2026\SketchUp\resources\en-US\Templates\Temp01a - Simple.skp"

  BLENDER_PATH=C:\Program Files\Blender Foundation\Blender5.1\blender.exe
  你也检查一下，全部六个软件里，还有没有其它需要配置的路径，仍然留的是本机的结果。

  3.检查一下，四个在windows测的task的json中，路径前缀都应该是C:\\Users\\Administrator\\Desktop，剩下两个应该是/home/usr/Desktop。

---

针对你所说的还没达到预期的，一条条回复：

我们目前先做GUI评测，所以现在只有-v是没问题的。
Librecad的回车操作是别人修改的，做的事情一样，不用改
应该在现有的输入回车的操作之前，加上“左键 EAGLE Express” 的操作。注意sleep时间如果没到3秒，要变长至3秒（enter接在这之后的0.5秒）
这些source全改成human_craft
发现的几个instruction修改成合适的版本

先把这些做了

---

blender的local_path改成用/连接，剩下的路径不变。

![image-20260503030502364](C:\Users\HUAWEI\AppData\Roaming\Typora\typora-user-images\image-20260503030502364.png)

---

这七个软件，除了没有-c的zbrush和暂时测不了的sketchup，剩下5个软件的-c部分，有一些任务可能要修改下。

具体地说，我们希望这些-c，也即被测者使用CLI而不是GUI完成的任务，能够更加测试到一个命令行操作的强大和优势，就是便于批量化。
因此，对于每个软件的task-c所有任务，你先看一下有哪些是已经涉及批量化操作的。对于没有涉及批量化操作的，你看一下哪些任务是比较简单or适合变成批量化的。

我们最终的目标，是让这五个软件的所有-c部分都有一半（如果原来已经有了超过一半的，也不用删哈）的任务是涉及批量化操作的（也就是确实很需要CLI，批量脚本这种的）。做法是：
1. 看已有的批量化任务够不够。不够的话看看哪些适合改成批量化（如上所说）

2. 对于那些要修改的，**尽可能保证我们的修改只是把原有任务加上一个批量化**，从做一个变成做多个，原来单个的任务逻辑基本不变，只是加上批量，更加考验CLI了。不止任务逻辑是这样，instruction中的自然语言表述也是一样，只是从让它做一个变成让它做多个，保证能让被测者理解任务内容的情况下，尽可能保留原有的叙述方式，不要做出不必要的修改，诸如加上"请使用CLI或批量化脚本来完成这个任务"这种多余表述之类的。

  修改过程要保证：
  instruction，eval.py，我们的标准答案，是逻辑上完全一致的。被测者阅读instruction，就能理论上保证理解并确定地导向通过eval.py的结果。由于这一点，我们目前的任务应该是已经完成得非常好了，所以更加强调了只是在原有基础上加上批量化。不过，你也检查一下，如果真的发现非常明显的“被测者阅读instruction，根本不能明确导向通过eval的结果”或者“instruction表达的和eval.py测的根本不一致”，那就也修改，并且把所有修改的条目告诉我。

和之前修blender一样，你可以调用软件做新的GT；一切修改都完成后，你要把所有这一波修改后的任务进行模拟桌面GT测试。

---

![image-20260517125405689](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260517125405689.png)

---

对于你列出的四点，都修改一下。
原则就是，instruction的职责是让被测者阅读后理解任务内容，明确导向通过eval的结果。
因此，像那些其实是叙述历史问题、莫名出现的不要怎么做的警告（而非为了消除必要的歧义或增加限制）等等的内容，不需要的话，都删掉。再比如对于eval判定逻辑的泄露，如果instruction已经说清任务要求，阅读后就能做出通过eval的答案了，就也没必要这样讲，反而让被测者容易hack，也不要了。（注意语言连贯和语法正确）
不过，也不要把真正必要的限制删掉了，如果一些内容确实有用，就保留。

---

类似地，对于kicad, eagle, orcad, blender, sketchup, zbrush 这六款软件，也check并修改（如果有问题）一下它们的instruction（-c/-v都要）。

在保证instruction能让被测者阅读后理解任务内容，明确导向通过eval的答案，这样的原则和条件下，
任何冗余和不必要内容，比如莫名奇妙的的非必要消歧、任务限制已经说清楚的条件下的评测逻辑泄露、无关的历史叙述、在任务已经说清了，保证被测者理论上能完成任务的情况下又很具体地教授做法如细致地让它使用某某功能，都要被恰当地删掉。
现在我能想到的问题不一定能列举全，你可能要在得到这些软件的check结果后再具体分析问题。总之记住我们前面说的最核心的原则就好，根据具体情况和问题修改掉冗余和无用的内容。

---

我们在instruction中有很多对于初始文件的表述。比如，我看到有什么look at...之类的话。

---

1. 不应该缺号，空的号就用后面的前移。最后，比如1-25缺两个，就会变成1-23但是编号连续一个不缺。修改。
2. -c都是不launch软件的，只有upload_file把所有初始文件传上去。没有的不传，多个就写多次。如果有init_file中没传的，或者传的不存在的，修正。
3. -v的在上述的-c基础上，要有launch软件的命令的。如果哪个没有，修复一下。如果不知道launch软件的路径，再跟我说。
4. true/false问题，统一改成和reference一样的首字母大写。并且你还要看一下7个软件的eval.py，里面true/false也要是同样的首字母大写，如果有不对的就修改。
5. blender命令不一样没关系，你保证命令是正确可运行的即可。
6. 我们的七个软件，source都改成用分号分隔。
7. json里的软件启动路径如果和刚刚改过一波的eval.py不一致，改成eval.py的。
8. instruction的原则和条件是"让被测者阅读后理解任务内容，明确导向通过eval的结果”，这样看，The eval calls `blender --background --python eval.py ...`这种内容都是冗余的，把它们清掉。

---

所有使用altium designer软件的路径都改成D:\Program Files (x86)\Altium\AD17\DXP.EXE
zbrush都改成C:\Maxon ZBrush 2025\ZBrush.exe

by the way，我想问个问题，就是有的-v是涉及execute的，那个是干嘛用的

---

你看一下所有-v任务的init_file都是些什么。首先，肯定大部分都是要使用软件打开、编辑、处理的文件，比如blender的.blend文件，kicad的各种kicad_xxx文件。你看json也能知道，这些文件在被测者使用GUI操作完成任务前是要先被打开的（并且会是被相应的软件打开），这么干没毛病。
但是，我想到一件事，就是会不会有一些初始文件不适合被打开？比如（下面这个叙述仅仅是举例，你要根据我们的具体任务分析是否应该被打开），我的合作者的软件的一些tasks中，会有一些类似配置文件，其作用就仅仅是被软件导入，用文本编辑器什么的打开这类文件没有意义。
所以，你看一下我们七个软件的任务，是否存在非常明显的不应该在被测者开始操作前被打开的。如果真有，跟我说一下都有哪些。

---

很好，这个问题也OK了。接下来我们要进行的一波修改，都是针对Instruction的。

1. 有关对初始文件的表述。
   我先说一下在评测端被测者面对的情况：所有的-c任务，被测者只能面对一个命令行，而由此，重要的事情在于，没有初始文件是被打开的。
   因此，你的叙述应该类似" '/path/to/desktop/某文件'是xxx（比如‘初始电路板’‘待修复的模型’，仅仅举例哈）"、"任务中的初始模型（同样是仅仅举例哈）在'/path/to/desktop/某文件'"、“请处理/path/to/desktop/某文件，里面是xxx，我们要进行....”，以及所有适合具体task内容的对于init_file信息的恰当表述。
   了解了这些以后，请修改七个软件的任务的Instruction里，所有在上述的CLI评测环境下目前明显很不合适的对初始文件的表述，改成更恰当的表达。我给出的示例仅仅是举例，推荐你使用各种合适的多样化表达。而且，任何修改都还是要保证语言自然流畅，整个instruction清晰明确，让被测者能理解任务内容。

   再然后是-v。我们刚刚对初始文件进行的修改就是因为，初始文件的彼此特性是不同的，有的是主要被编辑和修改的文件，有的是非主工程文件，等等等等。这些差异决定了我们是否在upload后launch，也要决定我们在instruction中的表述。有的文件应该说“请看已经打开的abc.xyz文件，这是初始模型”、“要被修复的xxx板子在文件abc.xyz，已经被打开”，有的应该说“/path/to/desktop/某文件含有有关xxx的xxx信息”“xxx的配置在/path/to/desktop/某文件”（注意这里的有的…有的…的分类仅仅是示意和举例，里面的具体表述例子也都仅仅只是例子，合适的各种表达都是OK的，而且要看任务的具体内容调整你的表述）。和-c一样，我们要修改目前明显很不合适的对初始文件的表述，改成更恰当的表达。而且，任何修改都还是要保证语言自然流畅，整个instruction清晰明确，让被测者能理解任务内容。
   对了，有一个小细节，就是在-v中，所有已经被launch的文件，表达它们的时候就不带完整路径了（目前所有软件所有通道的tasks似乎都是完整路径描述的吧），只说文件+后缀名。其它都不变。

2. 目前的好像有的instruction风格是一段话的任务叙述，有的是比较结构化的文档格式。多样化的任务叙述是完全OK的，不过我们不希望叙述风格和软件产生bias，也就是某个软件都是某一类叙述风格。
   如果有上述情况，也即某个软件的所有tasks的Instruction都是某一类叙述风格，那就把一部分替换成另外一类。
   替换的过程一定要保证语言表达的东西完全不变，讲述的是同一个任务内容，仍然保证instruction理论上能让被测者阅读后理解任务内容，明确导向通过eval的答案。

3. 内容不变的条件下，处理一些细节问题。
   可能是因为之前的正则匹配或者多次迭代修改，Instruction中出现了一些细节上的问题。出现形式很多，比如大小写问题、标点使用问题、一些明显错误的英文语法问题、路径引用``引用了空、路径重复（好像有一个instruction里出现了C:\xxx\xxx\C:\xxx\xxx这种问题）、除号/被替换成\\，等等等等细节上的各种类型的错误。
   对此，不要根据我举的有限的例子去一个个匹配错误，最好是去读一遍，这样也便于处理新的具体细节错误，把它们全部处理。
   在保证需求描述清楚，不变动内容只是把细节处理好的条件下，你可以让很多subagent帮忙完成。

---

我们每个软件+通道的任务是希望模型使用特定软件的特定操作方式。因此，我们应当在instruction中加入对本任务完成方式的限制。
具体地说，我们只需要加一下很简短的限制：对-v，表达“请使用某软件的GUI操作完成本任务，某软件已经打开了”；对-c，表达“你可以使用任何通用命令行操作和脚本完成本任务；你也可以驱动xxx软件，[使用xxx命令]/[软件路径在/path/to/软件]”

---

1. 运行 git clone https://github.com/assassinlike/OSWorld.git

2. 在要进行调试的环境里 pip install requests

3. （可选）运行两个初步测试

   1. curl http://<要测试的软件实例 IP>:5000/platform

      能返回windows之类的信息即可。
      
   2. python scripts\python\sanity_check_remote_osworld.py `
   
       --host <IP> `
   
       --task-json <task-json-path> `
   
       --skip-config
   
      正常结束，输出done,ok什么的即可。
   
4. 想测试单个任务gt，就
   python scripts\python\sanity_check_remote_osworld.py `

    --host <IP> `

    --task-json <task-json-path> `

    --gt-check `

    --timeout 30

5. 想批量测试某个软件的所有gt，就
   python scripts\python\batch_gt_check_remote_osworld.py `

    --host <IP> `

    --software-dir <软件目录，上一级是task-c/task-v> `

    --timeout 30

OSWorld\logs\remote-gt-batch\<software>\<timestamp>\里会有批量测试的结果，看 summary.csv 就行

4和5要先cd到clone的OSWorld目录；4和5中的两个路径就填自己PC的Engiworld中的路径，比如我的Engiworld文件夹如果在D盘下，就分别可以填
D:\Engiworld\task\task-v\altium-designer\task-26\task-26.json
D:\Engiworld\task\task-v\altium-designer

---

目前经过gpt-5.5的测试，认为eagle的-v部分有些太简单了。所以，现在请你修改eagle-v的tasks，让那些目前比较简单的任务难度增大。
一是要增加任务本身的难度，在保证你的修改不是单纯机械叠加更多步骤和限制的条件下，让任务更复杂；二是在保证instruction能确定地导向通过eval的答案、让被测者理论上读完以后就能理解任务内容然后做出能pass的结果的条件下，尽量减少多余的信息给出，从而让题目有更大的难度以及更有必要的多轮交互，通过partial observation增加难度。
所有新的任务应该具有难度，尽可能让操作复杂、长线、涉及多轮交互、困难。
对于那些我们替换掉的简单的任务，放在assassinlike/Ultra-Engiworld这个repo的main分支的eagle文件夹下。

---

# task-v GUI 可完成性测试流程

我们的目标是模仿被测者，尝试使用 GUI 操作完成各个 Engiworld 的 `task-v` 任务，验证其是否真的可以通过 GUI 操作完成，通过该任务自己的 `eval.py`。并且，对于详尽测试确认后发现真的无法用GUI完成的任务，我们将其修改为GUI可以完成的。

---

# task-v GUI 可完成性测试流程

我们的目标是模仿被测者，尝试使用 GUI 操作完成各个 Engiworld 的 `task-v` 任务，验证其是否真的可以通过 GUI 操作完成，通过该任务自己的 `eval.py`。并且，对于详尽测试确认后发现真的无法用GUI完成的任务，我们将其修改为GUI可以完成的。

---

# 测试内容

模仿被测者，使用 GUI 操作完成任务，验证其是否真的可以通过 GUI 操作完成，通过该任务自己的 `eval.py`。**必须通过软件的 GUI 操作完成任务**，可以用 pyautogui 发送鼠标、键盘、热键等等多种 GUI 操作，但不能用软件GUI本身不支持的 Python / shell / 软件 API 操作。
当然，远程连接实例进行测试所需要的连接检查、运行 task config、截图、发送 pyautogui 操作、运行 eval等命令操作完全正常使用。

如果测试并不顺利，并不能完成任务，**可以考虑搜索软件的操作文档，进行所有合理的尝试**。
直到你确认这个任务真的无法使用GUI操作完成，那就在不改变任务内容和任务逻辑，确保考点和难度不变的情况下，把得到最终目标答案的过程变成GUI友好的操作。这种对任务的修改行为，你应该把所有部分，instruction、eval.py、初始文件（如果需要）、ground_truth 需要的改动都做好，确保 ground_truth 本身能通过eval.py，并且Instruction和eval.py的逻辑是一致的，理论上被测者阅读Instruction，理解了任务内容后，就能确定地导向通过eval.py的答案文件。

# 操作指导

本节给出完成上述测试中需要的技术指导。
这些仅仅是对代码使用的指导，在具体的情况和问题中你自行决定如何操作，完全无需机械遵守这里的使用方式。

下面所有命令都假设你clone了https://github.com/assassinlike/OSWorld.git，然后位于OSWorld 仓库根目录。任务 JSON、日志目录、截图目录都使用你当前工作区中的实际路径。

以下的指导可能涉及的变量标记：

```powershell
$HostIp = "<远程实例IP>"
$TaskJson = "<task-v任务json路径>"
$OutDir = "<本次测试的输出目录>"
```

其中 `$TaskJson` 指向当前要测的 `task-XX.json`，`$OutDir` 用来保存截图、eval 结果和测试记录。

## 连接和环境检查

先检查远程 OSWorld server 是否可用，并保存初始截图：

```powershell
python scripts/python/sanity_check_remote_osworld.py `
  --host $HostIp `
  --task-json $TaskJson `
  --skip-config `
  --out-dir "$OutDir/connect"
```

检查输出里应看到：

```text
[ok] platform: ...
[ok] screen_size: ...
[ok] screenshot saved: ...
```

如果这里失败，先不要做任务，记录为环境连接问题：

```text
BLOCKED-ENV: OSWorld server unreachable / screenshot failed / platform failed
```

可同时打开 noVNC 观察桌面：

```text
http://<远程实例IP>:5910/vnc.html
```

如果 noVNC 打不开但 `/screenshot` 可用，仍然可以继续用截图和 pyautogui 操作。

## 运行 task config

运行 task JSON 里的 `config`，这一步会上传初始文件、启动软件、打开需要打开的工程文件、处理欢迎页或弹窗等。

```powershell
python scripts/python/sanity_check_remote_osworld.py `
  --host $HostIp `
  --task-json $TaskJson `
  --out-dir "$OutDir/setup"
```

这条命令不加 `--evaluate`，也不加 `--gt-check`。它只做环境 setup，并保存 `before_setup.png` / `after_setup.png`。

如果 setup 后软件没有正常启动，先观察截图和 noVNC。常见情况：

```text
软件仍在启动中：等待 30-120 秒后再截图。
欢迎页或弹窗残留、license / DLL / GPU / template 缺失：添加GUI操作将其修复，再进行任务的测试，详见后面“额外测试：环境问题”这一节
初始文件没有打开：检查 task JSON 的 config 是否应该 launch/open。
```

## 观察截图

保存当前截图：

```powershell
New-Item -ItemType Directory -Force "$OutDir/manual" | Out-Null
Invoke-WebRequest "http://$HostIp`:5000/screenshot" -OutFile "$OutDir/manual/obs.png"
```

完成任务时，就是这样截图然后打开图片来观察，决定下一步的操作。

个人建议，每做 1-5 个 GUI 动作就重新截图。不要一口气执行很长串操作后才看结果。

## 发送 GUI 操作

推荐使用 `/run_python` 发送短小的 pyautogui 操作。它的用途是驱动 GUI，例如点击、按键、输入、拖拽、等待 UI 稳定。不要用它直接生成答案文件或绕过软件 GUI。

通用形式：

```powershell
$Code = @'
import pyautogui, time
pyautogui.FAILSAFE = False

# 在这里写 GUI 操作，例如：
# pyautogui.click(x, y)
# pyautogui.hotkey("ctrl", "s")
# pyautogui.write("text", interval=0.02)
# pyautogui.dragTo(x, y, duration=0.5, button="left")

time.sleep(1)
'@

Invoke-RestMethod `
  -Uri "http://$HostIp`:5000/run_python" `
  -Method Post `
  -ContentType "application/json" `
  -Body (@{ code = $Code } | ConvertTo-Json)
```

注意：

1. 坐标必须基于最新截图判断。
2. 每次操作后等 UI 稳定，再截图。
3. 不要用 `/run_python` 执行“生成答案文件”的业务逻辑；这里只能用来驱动 GUI。
4. 如果需要打开菜单，优先使用软件 GUI 的菜单、快捷键、对话框。

## 完成任务

按 instruction 做完后，确保答案保存到 instruction 要求的位置。常见情况：

```text
输出文件在桌面：answer.xxx / result.xxx / 指定文件名
直接保存回已打开工程文件
在软件工程里新增或修改对象后保存
导出报告、图片、BOM、模型等到桌面
```

然后运行 eval 检查手工结果。注意：这一步必须加 `--skip-config`，否则会重新跑 task config，可能覆盖或干扰你刚刚用 GUI 做出的答案。

```powershell
python scripts/python/sanity_check_remote_osworld.py `
  --host $HostIp `
  --task-json $TaskJson `
  --skip-config `
  --evaluate `
  --out-dir "$OutDir/eval" `
  --result-json "$OutDir/eval/result.json"
```

如果输出里有：

```text
[eval] exact_match: True
[done] remote sanity check completed
```

则该任务记为：

```text
PASS-GUI
```

如果 eval 不通过，不要立刻判定任务不可完成。先做诊断，比如：

1. 检查是否保存到正确路径。
2. 检查文件名、大小写、扩展名是否正确。
3. 检查软件是否真的保存成功。
4. 检查 instruction 是否要求了某个导出/保存动作但你漏做。

可以查看 `eval.py` 作为参考，看看是什么逻辑没有对上。

## 多任务问题

在同一实例上，我们要测试某软件所有任务，但测试过程中，前一个任务可能留下有影响的桌面文件、窗口状态、缓存文件等，导致后一个任务测试结果不可信。

所以，切换新任务时，请确保实例已经恢复到对应 snapshot 的干净状态，不存在对当前任务测试的干扰。

# 额外测试：环境问题

有极少数实例，在运行json中的操作后，得到的GUI界面状态并不是给被测者最自然的适合开始完成-v任务的状态。比如，需要多点两个欢迎页弹窗、有缺失文件报错需要先点掉等。
由于实例中的软件确认是安装好的，这些问题都可以通过在json中加入如GUI操作来解决，比如在等待一定时长让软件启动好后，添加按enter的操作，或添加在指定坐标点击的操作。

所以，如果你在测试的过程中，发现运行完json中的命令后，你截图看到的界面明显可以通过在json中再加入一些初始化时操作命令，来让其变为更适合作为初始桌面状态来完成-v任务的状态，那就加入这些操作到json中。任何这类修改，都一定要在重启实例后测试是否达到理想效果。

# 结果报告

每一个任务，在测试为可完成/修改后测试为可完成后，需要给出正确的操作流程总结。

每一个任务对应一个.md文件，写清楚全过程的操作流程，细致地描述如点击什么位置的什么按钮，进行什么操作，细致程度保证可复现性。
如果这个任务是修改后测试为可完成的，在后面记录对这个任务进行过的修改。

---

哈喽，最近的engiworld-bench是由我来帮忙主导一下，然后昨天讨论后确定了去做这样一件事：

由于目前的-v任务不知道能否通过GUI完成，而人工标注又太慢，软件专家目前也只能找到很少，所以打算用给我们生成题目的ai agent来自己测试一下。
我写了一个.md文档，叙述了这件事和具体的操作流程，直接给你的codex/cc/copilot看，它就能理解流程，自动化地检查或修改任务。也可以自己阅读一下，做合适的修改。如果某软件的题目需要提高难度，先做完，再进行这个检查。

这个还是需要IP，群里环境的同学又需要开一波实例了。费点米最后应该能报销

那个直接可用的.md文档和IP表都在 https://my.feishu.cn/wiki/Ah7Ew3xFxi7KmQkjgz7cK8cunxb?fromScene=spaceOverview

---

现在来看OleehyO/OSWorld的zangyh分支，这是我们给模型进行评测时使用的评测代码，我们要在这个分支中进行修改。

修改的原因是，我们发现在-c任务的测评中也有出现hack的现象。
测试时，我们只希望被测者**使用驱动目标软件的命令行**来完成任务，其它完成任务的手段都是非预期的。我们在日志中发现了一些hack，你要在评测代码中加入限制，禁止这些行为：在评测时禁止这些操作，并且同步在system prompt中加入限制说明，告知模型这些限制的存在。
hack有：

1. 直接文本地编辑文件来得到答案，而不是cli驱动软件完成。你要禁止这些编辑操作。
2. 使用python包来得到答案，而不是cli驱动软件完成。你要禁止这种方式。
3. cli驱动其它软件，而不是测评的目标软件。在一个软件的测评过程中，你需要把该软件可能涉及的其它软件使用（特别是下面的网址中的日志里，模型用过的其它软件hack方法）都禁掉。（每个软件涉及的限制会不一样）
4. **其它所有 https://huggingface.co/datasets/OleehyO/engiworld-exp/tree/main/prompt_agent_cli_maxstep100_maxtokendefault-20260614-000620/cli/gpt-5.5 中出现的非预期完成任务的方式，你看到具体情况相应地做出限制**

保证限制的有效性，同时避免误伤常用的正常行为。

---

你看一下目前这个评测框架，在评测-v任务时，pyautogui代码执行的超时限制是多长，有没有在sys prompt中说？-c的测试呢，各个操作的超时限制是多少？在两个任务的测试中，是否还有wait这个操作？

---

这些话题讨论得差不多了。

现在我们要做的是修改各个软件任务。在tasks分支，修改kicad的-c/-v，blender,eagle的-c，**用尽全力加大任务难度**。
加大难度时的一些原则是：

1. 保证instruction+init_file能让被测者阅读后理解任务内容，明确导向通过eval的答案。不要通过 不匹配测试地/模糊地 描述任务实际需求，让被测者因为理解不了任务而完成不了；
2. 尽可能制造出任务本质的困难，而不是仅仅叠更多的步数，让操作的数量变多；
3. 保证任务的修改是让任务难度单调不减的。这不意味着你每个任务都必须在原任务的基础上增加或调整从而保证单调不减，你能保证最终得到的任务是更难的即可。
4. 保证 ground_truth/ 是标准答案，能通过 eval.py。（实际测试时，eval.py 是会扫描桌面上的所有文件的，你测试时通过临时修改或者新建临时脚本来让它扫 ground_truth/ 下的所有文件。如果你需要用 linux，可以使用本机的 WSL）

一些*（仅供，仅供参考，任何加大难度的方式都可以，千万不要局限于我给出的方案）*加大难度的方式有：

1. 你可以参考技术报告、论文来发掘一些更不常见的困难 case；软件的教程文档也是一个参考，你可以从中发掘一些你不知道或不熟悉的软件使用方式。（但是不要全都往偏难怪去出，所有题目还是尽可能覆盖软件的各种使用方式）
   （如果你总是按照自身知识去设计任务而不参考*困难、复杂*的外部资料，那么和你一样的模型一定是能答出来的）
2. partial observation，把完成任务所必须的信息，甚至是任务本身是要做什么的信息（当然，应当设置得自然一些，不要弄成明显脱离实际情景的谜题式）放在初始文件内（那这些藏在其中的信息就不应当在instruction中告知了），让被测者必须去充分探索、发掘初始文件，甚至是多文件协同推断，了解之后才能完成任务。让任务复杂、长程。
   注意这里不要弄得太过，以至于违背上面的第一点。至少，经过充分的合理推断之后，能明确而唯一地知道任务内容是什么，导向通过eval.py的结果。

你可以调用多个 subagent，并且***必须详细地告诉他们上述需求***。你自己应当对需求有足够的理解，如果返回的结果不符合预期，你应当调整措辞，直到最后得到满意的结果。

---

不要这样做。完整的任务叙述请仍然放在instruction中，因为把任务指令换个位置并不会让题目变难。

你先把15个任务之外的没有修改的任务回退到原来的状态。然后对于修改的15个，你合理地把brief中的内容变成类似那些没有修改的任务的风格的instruction（然后删除brief，并且杜绝它的存在），这些任务就算改完了。

---

现在我们要在已有的固定软件任务上做一个东西：它们使用的任务是一样的，但是所在的环境不止有一个软件，而是还有一个同样能完成任务的软件，和一个完成不了这个任务的干扰软件。
请你仔细分析已有的所有任务和其内容，最终给我三个软件（对四十个任务都是相同的三个软件，因为这样就只用做一个环境）和四十个任务：对于每个任务，这三个软件和它的组合都满足上述条件，有一个是该任务原生的软件，一个是同样的完成任务的，一个干扰软件。
不同的任务，这种对应关系可能不一样，比如某个软件在一个任务里是原生的，另一个里就是干扰的。不过，千万不要为了追求这种多样性而牺牲了设置本身的合理性，替代软件就是得能完成，干扰软件就是得不能完成。
把最后选出的四十个任务的文件夹复制到final分支的task/open/下。

---

OK，这波就改完了。然后，我们还要再制作一些额外的任务：需要多软件流转的任务。
具体地说，我们需要设计十条长程、复杂、困难的 cli 任务，为了完成它，必须要使用四个软件。可选的软件候选是 `./Engiworld/task/task-c` 中所有的软件，唯一限制是它们必须都有某个操作系统(win/linux)的版本才行，（注意一个软件在json中标的OS不一定是它全部的OS，如果某个软件有另一个OS的版本，也可以正常使用）。
**对此，你先进行充分的构想和思考，设计出十条长程、复杂、困难的 engineering 任务（使用命令行完成的 cli 任务），保证它们在任务逻辑和内容上必须要涉及四个软件的使用。**这步做完以后，你把十个任务的内容详细地写成文档，然后做出它们各自的 init_file/,ground_truth,json文件和eval.py。btw,这些任务有一件特殊事情：instruction中应当提及所有必须产生的中间产物，并且eval.py也要检查这些所有的中间产物。

---

接下来我们还要再做一类任务：评价方式不是0/1的是否pass，而是看能够把一个可优化的指标优化到什么程度。
具体地说，请你在 kicad, eagle, altium designer, orcad, blender, zbrush(无cli) 中选择一个 cli 和一个gui 的软件，两个软件分别做五条任务，共十条。每条任务的内容都是去尽可能地优化某个东西，而 eval.py 则是根据其结果来计算一个指标（这个指标你先自然地做，如果有不方便归一化的不必强求）。

- 优化的东西最好是比较有操作空间的，上限高的，不能容易地达到理论最优解而是总还有点继续优化的可能的。
- 这些任务的 ground_truth 是一个 baseline/reference 作用，可以是一个还不错的解。

---

那么，原有的 system prompt 有没有内容和 open, quantified, multi 任务内容相违背，从而让其不适合？

---

现在有这样一件事：
你需要做120条以生成相应软件能运行的代码为最终结果的任务，cli的，no loop（就是模型一轮输出个代码就结束了，不管任务难度是高是低，不会要求有多轮的操作），**任务内容需要和半导体相关**（虽然像eda软件好像基本就是用来做半导体的，但instruction尽量也都和半导体多相关一些）。
给大概7-8个软件设置任务，要求它们都能运行代码从而可以给出答案、能做出题目。容易出出来和半导体相关的题目的软件可以分配更多的题目。
每个任务的文件夹都要有json文件，eval.py和gt（代码）。放在final分支的一个新文件夹里。
