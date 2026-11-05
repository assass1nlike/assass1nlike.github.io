# 后训练的数学本质与作用：从答案概率到可靠求解

## 汇报摘要

后训练会根据示范答案或评分反馈调整模型，让某些回答更容易出现、另一些回答更少出现。但测试分数提高以后，模型究竟在哪方面变好了？本汇报把这个问题拆成三件事：

- **答得更稳：** 对同一道题，生成一次回答时，答对的概率提高了。
- **过程更可靠：** 最终答案正确的同时，中间推理也更经得起检查。
- **能解决的题目更多：** 给训练前后的模型相同的尝试次数，训练后的模型能答对更多不同题目。

这三件事可以同时发生，也可能只发生其中一件。例如，模型在少数题上进步很大、在另一些题上退步，平均分仍可能提高。第 1 节介绍的论文分歧正来自这里：只看最终答案，和进一步检查推理过程，可能对后训练的收益作出不同判断。我们需要解释这些变化怎样产生，再确定怎样测量它们。对于安全训练，也要区分“更常拒答”和“确实更少违规，同时仍能帮助正常用户”。

先问：**奖励本身希望模型怎样改变？** **2.1 节**允许自由调整每种回答的概率，求出理想结果：在原有概率的基础上，高奖励回答被放大，低奖励回答被压低。这已经能解释正确率为什么会上升，但还没有告诉我们，变得常见的回答是否具有正确的推理过程。实际神经网络也不能随意、独立地指定每个回答的概率，因此 **2.2 节**研究它怎样在能够表示的分布中，寻找最符合训练目标的一个。**2.3 节**再比较两种学习方式：SFT 模仿给定示范，RL 根据自己生成的回答得分来更新。即使希望学到同一组回答，两种方式也可能把概率分配得不同，一种保留多个回答方式，另一种更集中于少数回答。因此，仅知道分数变高，还不足以知道模型保留了什么、舍弃了什么。

接着问：**这些理想变化，实际训练能做到吗？** **3.1 节**先给出一个简单参照：只提高已有正确回答的总概率，不改变这些正确回答之间的比例，就能让模型答得更稳。然后 **3.2 节**指出困难：如果正确回答极少出现，训练可能要生成大量回答才第一次看到成功；一个好答案“有可能生成”，不等于训练已经获得了学习它的机会。获得样本后，**3.3 节**解释最终得分怎样转化为模型参数的更新，从而改变回答概率。**3.4 节**再分析 GRPO：它为同一道题生成多个回答，并比较它们的得分；如果这一组全对或全错，就没有高低之分，无法提供这种比较信号。这说明，训练集里有一道题，不代表模型真的从它获得了有效更新。因此，某些题上的正确率可以提高，另一些题却长期没有进展。

再问：**只奖励最终答对，为什么可能让推理过程也变好？** **4.1 节**说明，中间步骤会影响后续答对的机会：不同步骤虽然都只在最后收到评分，但对许多次尝试取平均后，它们对应的得分并不相同，训练因而有机会偏向更有用的步骤。接着 **4.2 节**给出关键条件：在理想优化下，如果正确推理比错误推理更容易得到正确答案，答案奖励就会提高正确过程的比例；如果猜测或捷径也容易得分，这种作用就会减弱。如果评分规则本身有漏洞，模型甚至可能得分更高、实际表现却更差。最后，**4.3 节**解释这些变化怎样影响其他题目：不同回答使用同一套模型参数，所以对一个回答的训练，也可能提高或降低其他回答的概率。这为“学到一道题后能帮助更多题”提供了机制，也解释了为什么训练新任务可能损害原有能力或安全行为。

最后问：**实验怎样判断模型实际获得了哪种收益？** **5.1 节**分析 pass@k，即独立生成 k 次、至少答对一次的概率，并说明平均单次正确率提高时，多次尝试后能答对的题目反而可能变少。**5.2 节**据此回到开场论文：统计答案是否正确，主要告诉我们哪些题更容易答对；检查中间步骤，则补充了过程是否可靠的证据。**5.3 节**把这些区别落实到评估：分别比较各题成功率、推理过程和未见任务上的表现，并控制计算预算。安全评估也要分别检查实际违规、正常请求上的帮助性，以及换一种提问方式或继续训练后，这些行为能否保持。这样，汇报最后回答的就不只是“分数涨了多少”，而是“哪些行为变好了、为什么可能变好、证据是否真的测到了这种变化”。

## 1. 分数提高以后，模型究竟学到了什么？

同一个基础模型经过后训练，数学题的单次正确率可以明显提高，回答也可能出现更长的推理、检查和回溯。安全训练也会改变模型的行为，例如在危险请求上拒答、在信息不足时澄清、在执行操作前识别风险。我们想解释的是：这些变化怎样产生，它们究竟是特定回答变得更常见，还是形成了更可靠的判断与求解能力？

两篇研究把这个问题具体化了。*Does Reinforcement Learning Really Incentivize Reasoning Capacity in LLMs Beyond the Base Model?* [1] 观察到，在其测试设置中，RLVR 模型往往单次回答更准，但基础模型经过大量采样后能够追上，甚至覆盖更多题目。*Reinforcement Learning with Verifiable Rewards Implicitly Incentivizes Correct Reasoning in Base LLMs* [2] 进一步检查推理过程，发现只统计最终答案正确与要求推理过程也正确，可能得到不同的比较结果。

这里的 RLVR 指用可验证的结果奖励训练模型，例如数学答案是否正确、程序是否通过测试。pass@k 指独立生成 k 个回答后，至少有一个通过验证的概率。两篇工作的分歧提示我们：**更容易生成正确答案、推理过程更可靠、能够解决更多问题，并不是同一个变化。** 对 safety 也有对应的问题：在一组危险提示上更常拒答，是否意味着模型在提示改写、多轮交互和后续微调后仍能识别风险？如果同时拒绝了大量正常请求，这种分数提升又有多少实际价值？

要解释这些现象，先把模型写成一个条件概率分布。输入为 \(x\)，完整回答为 \(y=(y_1,\ldots,y_T)\)，基础模型给出

$$
\pi_0(y\mid x)=\prod_{t=1}^T\pi_0(y_t\mid x,y_{<t}).
$$

正确答案具有非零概率，意味着它可能被生成；能否在有限预算内可靠地找到它，还取决于这个概率有多大、一次生成需要多少计算，以及失败后能否有效调整下一次尝试。

本次分享以 RLVR 为主要案例，用监督微调 SFT 作对照，区分三种可能同时发生的收益：**已有题目更容易答对、推理过程更可靠、在给定计算预算下能够解决更多题目。** 概率改变是这些收益的共同表现；我们要判断变化发生在哪些题目和过程上，以及哪些训练机制能够产生它们。安全上的对应要求是，实际违规减少、正常请求上的帮助性保持，以及这些判断在新情境和后续训练中仍然有效。

第二节分析分数提高可能对应哪些目标分布，第三节解释各任务为什么获得不同的学习机会，第四节直接分析过程可靠性与跨轨迹迁移的机制，第五节再用这些区别判断论文证据。

## 2. 理想目标：奖励希望把回答分布变成什么样？

要判断分数提升意味着什么，先明确奖励本身会选择哪些回答。这里暂时忽略采样不足和神经网络的优化困难，允许直接调整所有回答的概率，求出理想目标；随后再看模型限制和训练准则怎样改变对它的近似。

### 2.1 奖励与参考模型共同定义目标

设 \(q(x)\) 是训练关注的提示分布，\(r(x,y)\) 是回答的奖励，\(\pi_0(y\mid x)\) 是固定参考模型。用 \(\beta>0\) 控制偏离参考模型的代价，定义

$$
J(\pi)=\mathbb E_{x\sim q,y\sim\pi(\cdot\mid x)}[r(x,y)]
-\beta\,\mathbb E_{x\sim q}
\mathrm{KL}\bigl(\pi(\cdot\mid x)\|\pi_0(\cdot\mid x)\bigr),
\qquad \max_\pi J(\pi).
\tag{1}
$$

第一项鼓励高奖励回答，第二项为改变回答分布付出代价。后文的精确分布推导都从这个固定奖励、固定参考模型的目标出发；SFT 的训练目标则在 2.3 节单独引入。

考虑固定奖励、固定参考模型且 \(\beta>0\) 的式（1），假设奖励有上界 \(r(x,y)\le M_x<\infty\)。这样，后面用于归一化的权重和满足

$$
0<\sum_y\pi_0(y\mid x)e^{r(x,y)/\beta}
\le e^{M_x/\beta}\sum_y\pi_0(y\mid x)
=e^{M_x/\beta}<\infty,
$$

从而可以把这些权重除以其总和，得到概率分布。对每个固定的 \(x\)，调整回答概率时必须满足 \(\sum_y\pi(y\mid x)=1\)，所以不能把各个回答的概率独立调大。拉格朗日乘子法用一个待求的系数，把这条等式约束纳入求导过程。

先看一般形式：最大化 \(f(z)\)，同时要求 \(g(z)=0\)。在约束梯度非零的最优点，任何保持约束的一阶移动 \(v\) 都满足 \(\nabla g(z)^\top v=0\)，而最优性要求 \(\nabla f(z)^\top v=0\)。否则，沿 \(v\) 或 \(-v\) 就能提高目标。因此，目标梯度必须与约束梯度平行，可以写成

$$
\nabla f(z)+\lambda\nabla g(z)=0.
$$

定义拉格朗日函数 \(\mathcal L(z,\lambda)=f(z)+\lambda g(z)\)，上面的条件就是 \(\nabla_z\mathcal L=0\)；对 \(\lambda\) 求导则恢复原约束 \(\partial_\lambda\mathcal L=g(z)=0\)。这里是等式约束，乘子 \(\lambda\) 可以为任意实数。

回到回答概率，固定提示 \(x\)，令每个 \(\pi(y\mid x)\) 作为一个优化变量，约束为 \(g(\pi)=\sum_y\pi(y\mid x)-1=0\)，于是

$$
\mathcal L(\pi,\lambda)=
\sum_y\pi(y\mid x)r(x,y)
-\beta\sum_y\pi(y\mid x)\log\frac{\pi(y\mid x)}{\pi_0(y\mid x)}
+\lambda\left(\sum_y\pi(y\mid x)-1\right).
$$

我们在参考模型具有正概率的回答上求解。对其中任意一个回答，令 \(p=\pi(y\mid x)\)、\(p_0=\pi_0(y\mid x)\)，则

$$
\frac{d}{dp}\left[p\log\frac{p}{p_0}\right]
=\log\frac{p}{p_0}+1.
$$

奖励项的导数是 \(r(x,y)\)，约束项的导数是 \(\lambda\)，因此对 \(\pi(y\mid x)\) 求导并令其为零：

$$
r(x,y)-\beta\left(\log\frac{\pi(y\mid x)}{\pi_0(y\mid x)}+1\right)+\lambda=0.
$$

先解出概率与乘子的关系：

$$
\log\frac{\pi(y\mid x)}{\pi_0(y\mid x)}
=\frac{r(x,y)}{\beta}+\frac{\lambda}{\beta}-1,
\qquad
\pi(y\mid x)=\pi_0(y\mid x)e^{r(x,y)/\beta}e^{\lambda/\beta-1}.
$$

固定提示后，最后一个因子对所有回答都相同。用 \(\sum_y\pi(y\mid x)=1\) 确定它：

$$
e^{\lambda/\beta-1}
=\frac1{\sum_y\pi_0(y\mid x)e^{r(x,y)/\beta}}.
$$

代回即得

$$
\boxed{
\pi^*(y\mid x)=
\frac{\pi_0(y\mid x)\exp(r(x,y)/\beta)}{Z(x)}
},
\tag{2}
$$

其中

$$
Z(x)=\sum_y\pi_0(y\mid x)\exp(r(x,y)/\beta)
$$

是所有候选回答经过奖励加权后的权重之和，称为配分函数。分子 \(\pi_0(y\mid x)e^{r(x,y)/\beta}\) 只是未归一化的权重；除以 \(Z(x)\) 后，各回答的概率之和才等于 1。

还要确认：求导为零得到的分布为什么是最大值，而不是最小值？固定提示 \(x\)，把对应的目标记为

$$
F(\pi)=\sum_y\pi(y\mid x)r(x,y)
-\beta\sum_y\pi(y\mid x)\log\frac{\pi(y\mid x)}{\pi_0(y\mid x)}.
$$

从刚求出的 \(\pi^*\) 出发，任取另一个可行分布 \(\rho\)，沿两者之间的线段移动：令 \(v(y)=\rho(y\mid x)-\pi^*(y\mid x)\)，并令 \(\pi_t=\pi^*+tv\)，其中 \(0\le t\le1\)。因为两端都是概率分布，\(\sum_yv(y)=0\)，整条线段也都是概率分布。

在起点，前面的驻点条件给出 \(\partial F/\partial\pi(y\mid x)=-\lambda\)，所以沿这条线段的一阶导数为

$$
\left.\frac{dF(\pi_t)}{dt}\right|_{t=0}
=\sum_y(-\lambda)v(y)=0.
$$

再求一次导数。奖励项是概率的线性函数，二阶导数为零；每个负 KL 项的二阶导数是 \(-\beta/\pi_t(y\mid x)\)，因此

$$
\frac{d^2F(\pi_t)}{dt^2}
=-\beta\sum_y\frac{v(y)^2}{\pi_t(y\mid x)}<0
\qquad(\rho\ne\pi^*,\ 0\le t<1).
$$

这意味着沿任何通向其他分布的方向，斜率都从零开始不断减小，目标值随之下降，所以 \(F(\rho)<F(\pi^*)\)。这种“沿任意非平凡线段都向下弯曲”的性质称为严格凹性；它保证刚求出的分布是唯一的最大值点。

将式（2）代回目标函数，利用

$$
\log\frac{\pi^*(y\mid x)}{\pi_0(y\mid x)}
=\frac{r(x,y)}{\beta}-\log Z(x),
$$

可得

$$
\begin{aligned}
J(\pi^*)
&=\mathbb E_{x\sim q,y\sim\pi^*}
\left[r(x,y)-\beta\log\frac{\pi^*(y\mid x)}{\pi_0(y\mid x)}\right]\\
&=\mathbb E_{x\sim q,y\sim\pi^*}[\beta\log Z(x)]\\
&=\beta\,\mathbb E_{x\sim q}[\log Z(x)].
\end{aligned}
\tag{3}
$$

也就是说，\(\beta\log Z(x)\) 给出了在提示 \(x\) 下，综合奖励收益和偏离参考模型的代价后能达到的最优值。

如果两个回答 \(y_1,y_2\) 在预训练模型中的概率比为

$$
\frac{\pi_0(y_1\mid x)}{\pi_0(y_2\mid x)},
$$

最优分布中的概率比变为

$$
\frac{\pi^*(y_1\mid x)}{\pi^*(y_2\mid x)}
=
\frac{\pi_0(y_1\mid x)}{\pi_0(y_2\mid x)}
\exp\left(\frac{r(x,y_1)-r(x,y_2)}{\beta}\right).
\tag{4}
$$

奖励差越大，两个回答的相对概率改变越明显；\(\beta\) 越大，改变越温和。这个解直接解释了一种分数提升：原本已有概率的高奖励回答变得更常见。至于增加的概率是否落在正确推理过程上，需要第 4.2 节检验奖励与过程正确性的关系；实际训练如何发现这些回答、怎样影响其他任务，则分别由第 3 节和第 4.3 节解释。

### 2.2 有限模型如何逼近理想分布

式（2）还可以把式（1）改写成一个精确恒等式。对任意策略 \(\pi\)，有

$$
\begin{aligned}
\beta\,\mathbb E_{x\sim q}\mathrm{KL}(\pi\|\pi^*)
&=\beta\,\mathbb E_{x\sim q,y\sim\pi}
\left[\log\frac{\pi(y\mid x)}{\pi_0(y\mid x)}
-\frac{r(x,y)}{\beta}+\log Z(x)\right]\\
&=\beta\,\mathbb E_{x\sim q}\log Z(x)-J(\pi).
\end{aligned}
$$

结合式（3），就得到

$$
\boxed{J(\pi^*)-J(\pi)
=\beta\,\mathbb E_{x\sim q}
\mathrm{KL}\bigl(\pi(\cdot\mid x)\|\pi^*(\cdot\mid x)\bigr).}
$$

这个等式把“目标值还差多少”精确转化为“与理想分布还有多大 KL”。令 \(\Pi=\{\pi_\theta:\theta\in\Theta\}\)，其中 \(\Theta\) 是允许训练的参数集合，\(\Pi\) 就是模型能表示的所有条件分布。限制到这个模型族后，优化原目标等价于

$$
\pi_{\rm RL}=\arg\min_{\pi\in\Pi}
\mathbb E_{x\sim q}\mathrm{KL}(\pi(\cdot\mid x)\|\pi^*(\cdot\mid x)).
$$

这给出了“投影”的具体含义：理想分布无法被精确表示时，选择使上述 KL 最小的可实现分布。因此，奖励定义了哪些回答值得强化，模型能表示什么则决定这些要求能否同时实现；仅知道理想目标，仍不足以判断哪些回答或任务会获得提升。下一节用 SFT 作对照，检验同一目标的不同近似方式是否也会改变概率分配。

### 2.3 SFT 与 RL 为什么可能学出不同的分布

设示范数据来自某个目标分布 \(p_D(y\mid x)\)。标准 SFT 最小化

$$
\mathcal L_{\rm SFT}(\theta)
=-\mathbb E_{x\sim q,\,y\sim p_D(\cdot\mid x)}
\log\pi_\theta(y\mid x).
\tag{5}
$$

固定提示 \(x\)，在负对数似然中加上再减去 \(\log p_D(y\mid x)\)：

$$
\begin{aligned}
\mathbb E_{y\sim p_D}[-\log\pi_\theta(y\mid x)]
&=-\sum_y p_D(y\mid x)\log\pi_\theta(y\mid x)\\
&=-\sum_y p_D(y\mid x)\log p_D(y\mid x)
+\sum_y p_D(y\mid x)
[\log p_D(y\mid x)-\log\pi_\theta(y\mid x)]\\
&=\underbrace{-\sum_y p_D(y\mid x)\log p_D(y\mid x)}_{H(p_D)}
+\underbrace{\sum_y p_D(y\mid x)
\log\frac{p_D(y\mid x)}{\pi_\theta(y\mid x)}}_{\mathrm{KL}(p_D\|\pi_\theta)}.
\end{aligned}
$$

其中 \(H(p_D)=-\mathbb E_{y\sim p_D}\log p_D(y\mid x)\) 是给定提示时示范分布的熵。示范分布固定，因此这一项与模型参数 \(\theta\) 无关，最小化交叉熵就等价于最小化剩下的 KL 项。

用同一个可实现分布族 \(\Pi\) 表示模型的限制，SFT 的最优模型可以写为

$$
\pi_{\rm SFT}
=\arg\min_{\pi\in\Pi}\mathbb E_{x\sim q}
\mathrm{KL}\left(p_D(\cdot\mid x)\middle\|\pi(\cdot\mid x)\right).
\tag{6}
$$

这里的“投影”就是：在模型能够表示的分布中，选择一个使上述 KL 最小的分布。若模型无法精确表示 \(p_D\)，便用这个准则寻找最接近它的可实现分布。

如果示范恰好来自 \(p_D=\pi^*\)，SFT 最小化 \(\mathrm{KL}(\pi^*\|\pi_\theta)\)，KL 正则 RL 则最小化 \(\mathrm{KL}(\pi_\theta\|\pi^*)\)。二者拥有同一个理想目标，却以相反方向的 KL 衡量近似误差。

差别来自期望由谁采样。SFT 的期望取在示范分布上，模型漏掉一个示范模式就会被惩罚；RL 的期望取在当前策略上，模型主要为自己实际生成的回答负责。假设只有三个候选回答，目标分布为 \(\pi^*=(0.49,0.49,0.02)\)，而模型只能表示两种分布：

$$
\pi_A=(0.25,0.25,0.50),\qquad
\pi_B=(0.97,0.02,0.01).
$$

\(\pi_A\) 保留了前两种高目标概率的回答，却在第三种回答上分配了过多概率；\(\pi_B\) 主要选择第一种回答，几乎漏掉第二种。代入 KL 定义，有

$$
\begin{aligned}
\mathrm{KL}(\pi^*\|\pi_A)&\approx0.595,
&\mathrm{KL}(\pi^*\|\pi_B)&\approx1.247,\\
\mathrm{KL}(\pi_A\|\pi^*)&\approx1.273,
&\mathrm{KL}(\pi_B\|\pi^*)&\approx0.592.
\end{aligned}
$$

所以，若示范来自 \(\pi^*\)，SFT 会选择 \(\pi_A\)，因为漏掉第二种示范回答的代价很大；KL 正则 RL 会选择 \(\pi_B\)，因为它更少生成目标分布中罕见的第三种回答。这就是模型无法精确表示目标时，两种 KL 方向可能给出不同答案的原因。

这个例子给出了与核心问题直接相关的区别：训练可以通过集中于少数高质量回答来提高表现，也可以保留更多回答模式；即使理想目标相同，所用准则也可能偏向不同结果。这里讨论的是同一提示下的回答模式，各题之间的覆盖还要在第 5.1 节检查。接下来转向实际学习：这些理想变化能否从有限样本中获得足够信号？

## 3. 学习障碍：为什么有好解，训练仍可能没有进展？

理想分布的表达式包含每个回答的奖励，但实际模型要先生成回答，才能获得验证器的反馈。对非常稀有的成功事件，优化目标与获得训练信号的难度可能差得很远。先用二值奖励把这一区别算清楚。

### 3.1 提高成功率所需的分布变化

固定提示，令 \(\mathcal C\) 为所有成功轨迹的集合，参考模型的成功率为 \(p_0=\pi_0(\mathcal C)\in(0,1)\)，目标模型的成功率为 \(p=\pi(\mathcal C)\)。下面先把概率写成“属于哪一类的概率”乘以“类内条件概率”。

先考虑 \(0<p<1\)。\(\mathcal C^c\) 表示失败轨迹的集合。对成功轨迹 \(\tau\in\mathcal C\)，有

$$
\pi(\tau)=p\,\pi(\tau\mid\mathcal C),\qquad
\pi_0(\tau)=p_0\,\pi_0(\tau\mid\mathcal C),
$$

其中 \(\pi(\tau\mid\mathcal C)=\pi(\tau)/p\)，并满足 \(\sum_{\tau\in\mathcal C}\pi(\tau\mid\mathcal C)=1\)。因此，成功轨迹对总 KL 的贡献为

$$
\begin{aligned}
\sum_{\tau\in\mathcal C}\pi(\tau)\log\frac{\pi(\tau)}{\pi_0(\tau)}
&=\sum_{\tau\in\mathcal C}p\,\pi(\tau\mid\mathcal C)
\log\frac{p\,\pi(\tau\mid\mathcal C)}
{p_0\,\pi_0(\tau\mid\mathcal C)}\\
&=p\log\frac p{p_0}
\underbrace{\sum_{\tau\in\mathcal C}\pi(\tau\mid\mathcal C)}_{1}
+p\sum_{\tau\in\mathcal C}\pi(\tau\mid\mathcal C)
\log\frac{\pi(\tau\mid\mathcal C)}{\pi_0(\tau\mid\mathcal C)}\\
&=p\log\frac p{p_0}
+p\,\mathrm{KL}\bigl(\pi(\cdot\mid\mathcal C)
\|\pi_0(\cdot\mid\mathcal C)\bigr).
\end{aligned}
$$

对失败轨迹重复同一步骤，只需把成功概率换成 \(1-p\) 和 \(1-p_0\)：

$$
\sum_{\tau\in\mathcal C^c}\pi(\tau)\log\frac{\pi(\tau)}{\pi_0(\tau)}
=(1-p)\log\frac{1-p}{1-p_0}
+(1-p)\,\mathrm{KL}\bigl(\pi(\cdot\mid\mathcal C^c)
\|\pi_0(\cdot\mid\mathcal C^c)\bigr).
$$

把两类贡献相加，定义

$$
d_{\rm B}(p\|p_0)
=p\log\frac p{p_0}+(1-p)\log\frac{1-p}{1-p_0},
$$

便得到

$$
\begin{aligned}
\mathrm{KL}(\pi\|\pi_0)
={}&d_{\rm B}(p\|p_0)\\
&+p\,\mathrm{KL}\bigl(\pi(\cdot\mid\mathcal C)
\|\pi_0(\cdot\mid\mathcal C)\bigr)\\
&+(1-p)\,\mathrm{KL}\bigl(\pi(\cdot\mid\mathcal C^c)
\|\pi_0(\cdot\mid\mathcal C^c)\bigr).
\end{aligned}
$$

\(d_{\rm B}\) 是只记录成功与失败的两个 Bernoulli 分布之间的 KL，表示改变两类总概率的代价；后两项表示各类内部重新分配概率的额外代价。

KL 非负，所以总 KL 至少为 \(d_{\rm B}(p\|p_0)\)。而且这个下界可以达到：在成功类中令 \(\pi(\tau)=\frac p{p_0}\pi_0(\tau)\)，在失败类中令 \(\pi(\tau)=\frac{1-p}{1-p_0}\pi_0(\tau)\)，就只改变两类的总概率，保留各类内部的条件分布。后两项随之为零。

对二值奖励 \(r=\mathbf1_{\mathcal C}\)，成功轨迹的奖励为 1，失败轨迹的奖励为 0。代入式（2），成功轨迹的原概率都乘以 \(e^{1/\beta}\)，失败轨迹的原概率都乘以 1，再一起归一化。两类各自的总权重为

$$
\sum_{\tau\in\mathcal C}\pi_0(\tau)e^{1/\beta}
=p_0e^{1/\beta},\qquad
\sum_{\tau\in\mathcal C^c}\pi_0(\tau)=1-p_0.
$$

因此归一化常数是 \(Z=p_0e^{1/\beta}+1-p_0\)，最优分布的成功率和失败率分别为

$$
p^*=\frac{p_0e^{1/\beta}}{p_0e^{1/\beta}+1-p_0},\qquad
1-p^*=\frac{1-p_0}{p_0e^{1/\beta}+1-p_0}.
$$

每类中的轨迹都乘以相同系数，所以各类内部的相对概率没有改变。这正好满足前面的 KL 下界取等条件：在成功率等于 \(p^*\) 的所有分布中，这个分布所需的 KL 最小。

把成功率除以失败率，公共分母消去，得到

$$
\frac{p^*}{1-p^*}
=\frac{p_0}{1-p_0}e^{1/\beta}.
$$

\(p/(1-p)\) 称为成功的 odds，表示成功概率是失败概率的多少倍；其自然对数称为 log-odds。对上式取对数，就有

$$
\log\frac{p^*}{1-p^*}
=\log\frac{p_0}{1-p_0}+\frac1\beta.
$$

因此，奖励将成功相对于失败的概率比放大 \(e^{1/\beta}\) 倍。当 \(\beta\to0^+\) 时，偏离参考模型的代价越来越小，只要 \(p_0>0\)，上式中的 \(p^*\) 就趋于 1。这说的是改变优化目标中 KL 的权重；固定 \(\beta\) 时，理想最优成功率就是对应的 \(p^*\)。这一调整只改变成功与失败的总概率，保留成功类内各条轨迹的相对概率，因此提供了一个明确参照：单次正确率可以大幅提升，而成功类内部的解法比例完全不变。要判断实际训练是否还改善了过程，需要第 4 节的分析；在此之前，先问训练能否采到实现这次调整所需的成功样本。

### 3.2 找到成功轨迹所需的采样成本

若从基础模型独立采样 \(N\) 次，至少看到一次成功的概率为

$$
1-(1-p_0)^N.
$$

要以至少 \(1-\delta\) 的概率找到成功轨迹，需要

$$
N\ge\frac{\log\delta}{\log(1-p_0)}
\approx\frac{\log(1/\delta)}{p_0}
\qquad(p_0\ll1).
$$

另一方面，要让所有采样都成功，可以把参考模型直接条件化到成功集合上：

$$
\widetilde\pi(\tau)=\pi_0(\tau\mid\mathcal C)
=\begin{cases}
\pi_0(\tau)/p_0,&\tau\in\mathcal C,\\
0,&\tau\notin\mathcal C.
\end{cases}
$$

这个分布只生成成功轨迹，并保留它们原有的相对概率。计算 KL 时，失败轨迹的概率为零，不贡献求和；每条成功轨迹的概率比都等于 \(1/p_0\)，所以

$$
\begin{aligned}
\mathrm{KL}\bigl(\pi_0(\cdot\mid\mathcal C)\|\pi_0\bigr)
&=\sum_{\tau\in\mathcal C}\frac{\pi_0(\tau)}{p_0}
\log\frac{\pi_0(\tau)/p_0}{\pi_0(\tau)}\\
&=\log\frac1{p_0}
\underbrace{\sum_{\tau\in\mathcal C}\frac{\pi_0(\tau)}{p_0}}_{1}\\
&=\log\frac1{p_0}.
\end{aligned}
$$

它还是所有成功率为 1 的分布中 KL 最小的一个。令 \(\rho\) 为任意只在成功集合上取值的分布。对 \(\tau\in\mathcal C\)，由条件概率定义，有

$$
\pi_0(\tau)=p_0\pi_0(\tau\mid\mathcal C),\qquad
\log\frac{\rho(\tau)}{\pi_0(\tau)}
=\log\frac{\rho(\tau)}{\pi_0(\tau\mid\mathcal C)}
+\log\frac1{p_0}.
$$

将它代入 KL 定义，并利用 \(\rho\) 在成功集合上的概率之和为 1：

$$
\begin{aligned}
\mathrm{KL}(\rho\|\pi_0)
&=\sum_{\tau\in\mathcal C}\rho(\tau)
\log\frac{\rho(\tau)}{\pi_0(\tau)}\\
&=\sum_{\tau\in\mathcal C}\rho(\tau)
\log\frac{\rho(\tau)}{\pi_0(\tau\mid\mathcal C)}
+\log\frac1{p_0}\underbrace{\sum_{\tau\in\mathcal C}\rho(\tau)}_{1}\\
&=\mathrm{KL}\bigl(\rho\|\pi_0(\cdot\mid\mathcal C)\bigr)
+\log\frac1{p_0}\\
&\ge\log\frac1{p_0}.
\end{aligned}
$$

最后一步使用 KL 非负。等号要求第一个 KL 为零，即 \(\rho=\pi_0(\cdot\mid\mathcal C)\)。所以，让所有概率落在成功集合中至少要付出 \(\log(1/p_0)\) 的 KL；如果还改变成功轨迹之间的相对概率，就会付出额外的 KL。

发现成功的采样成本按 \(1/p_0\) 增长，而把全部概率转移到成功集合的最小 KL 只按 \(\log(1/p_0)\) 增长。**“目标分布距离基础模型不远”与“有限采样能够找到到达它的方向”，是两个不同的问题。**

例如，\(p_0=10^{-6}\) 时，将成功率提升到 \(p=1/2\) 的最小 KL 约为 \(6.215\) nats（以自然对数计）；但仅为了以 95% 的概率看到一次基础模型的成功，独立采样就需要约 300 万次。前一个数字描述最优解的代价，后一个数字描述发现有效训练信号的代价。

对于只有完整轨迹二值反馈、且失败没有提供可复用结构的采样过程，这个障碍尤其明显。课程学习、专家前缀、工具反馈和过程监督的共同作用，是改变可获得的信息或中间状态，让成功轨迹不必一次性从极小概率事件中出现。

*RLVR landscapes for iterated multiplications can be benign* [3] 研究了一个可以精确分析的例子：输入一串元素，模型逐步计算它们的乘积，只根据最终结果是否正确获得奖励。理论部分使用表格策略，即直接为有限的输入与生成历史记录下一步的选择概率。

在某些输入不相关、不同表格项不共享参数的设定下，作者证明奖励函数没有次优局部最大值。这排除了一种失败原因：策略停在一个尚未达到全局最优的解附近，却无法通过邻近的小幅调整提高奖励。但它没有排除另一种困难：许多不同策略给出相同奖励，局部更新缺少指向更好策略的信号，可能要经过很长的探索才能找到改进方向。用采样估计梯度时，微弱的改进信号还可能被估计误差淹没。

论文中的局部策略更新即使没有落入次优局部最大值，也可能停滞；随机重置或更强的熵正则在部分设置中有帮助。另一些 Transformer 实验则结合熵正则与课程学习，从随机初始化学会了相应的逐步计算。它说明本节需要区分的两件事：目标中存在好的解，并不等于有限采样的更新过程有足够信息找到它。

安全训练面临同样的发现成本，只是需要寻找的事件变成了失败。令 \(p_{\rm unsafe}\) 为某个待评估分布下的违规概率，独立运行 \(N\) 次后至少发现一次违规的概率为

$$
1-(1-p_{\rm unsafe})^N.
$$

如果违规罕见，普通采样可能一直没有提供可用于修正它的例子；主动构造风险场景、红队测试和失败轨迹回放的作用，就是提高这些事件在训练数据中的出现频率。这样得到的是新的训练采样分布，部署风险仍需在明确的用户或攻击分布上评估。

因此，能力训练要让罕见成功变得常见，安全训练则要先发现罕见失败，再降低它们的概率。两者都不能从“最近的批次表现很好”直接判断剩余问题已经消失。

因此，对“能否解决更多问题”的判断还必须考虑训练预算：基础模型给正确答案非零概率，并不保证有限采样能发现它；没有发现也不足以证明它绝不可能生成。即使已经采到成功，仍需把结果反馈变成参数更新，下一节给出这一步的机制。

### 3.3 有限轨迹怎样提供策略梯度

前面求出了希望达到的回答分布，也说明了成功样本为什么难以发现。接下来要回答：**即使验证器只告诉我们最终对错，而不能对推理过程求导，一条被采样到的成功轨迹怎样推动模型参数更新？**

固定提示 \(x\)，将生成过程写成轨迹 \(\tau=(y_1,\ldots,y_T)\)，轨迹概率为 \(\pi_\theta(\tau\mid x)=\prod_{t=1}^T\pi_\theta(y_t\mid x,y_{<t})\)。验证器给出最终奖励 \(R(\tau)\)，它在给定轨迹后不直接依赖模型参数。先单独看奖励项，目标是最大化平均奖励

$$
J_x(\theta)=\mathbb E_{\tau\sim\pi_\theta(\cdot\mid x)}[R(\tau)]
=\sum_\tau\pi_\theta(\tau\mid x)R(\tau).
$$

这里参数改变的是各条轨迹出现的概率。利用 \(\nabla_\theta\pi_\theta=\pi_\theta\nabla_\theta\log\pi_\theta\)，把对所有轨迹的求和写成可以用采样估计的期望：

$$
\begin{aligned}
\nabla_\theta J_x
&=\sum_\tau R(\tau)\nabla_\theta\pi_\theta(\tau\mid x)\\
&=\sum_\tau\pi_\theta(\tau\mid x)R(\tau)
\nabla_\theta\log\pi_\theta(\tau\mid x)\\
&=\mathbb E_{\tau\sim\pi_\theta}
[R(\tau)\nabla_\theta\log\pi_\theta(\tau\mid x)].
\end{aligned}
$$

因此，无需对验证器求导，也无需知道所有回答的奖励。独立采样 \(N\) 条轨迹，令 \(s_i=\nabla_\theta\log\pi_\theta(\tau_i\mid x)\)，就可以用

$$
\widehat g_0=\frac1N\sum_{i=1}^N R(\tau_i)s_i,\qquad
\theta\leftarrow\theta+\eta\widehat g_0
$$

估计奖励梯度并更新参数，其中 \(\eta>0\) 是学习率。对二值奖励，成功轨迹贡献增大自身 log 概率的方向，失败轨迹的权重为零。如果这一批全部失败，\(\widehat g_0=0\)。这把前面的发现成本直接连到了训练上：目标中存在好解，并不能替代实际采到的奖励信号。

有限样本还会带来梯度波动。为降低波动，可以选取不依赖当前轨迹随机结果的基线 \(b(x)\)，例如用此前数据预测当前策略在该题上的平均奖励。它可以从奖励中减去，因为

$$
\begin{aligned}
\mathbb E_{\tau\sim\pi_\theta}
[b(x)\nabla_\theta\log\pi_\theta(\tau\mid x)]
&=b(x)\sum_\tau\nabla_\theta\pi_\theta(\tau\mid x)\\
&=b(x)\nabla_\theta1=0.
\end{aligned}
$$

于是奖励梯度也可以写成

$$
\begin{aligned}
\nabla_\theta J_x
&=\mathbb E_{\tau\sim\pi_\theta}
[(R(\tau)-b(x))\nabla_\theta\log\pi_\theta(\tau\mid x)]\\
&=\mathbb E_{\tau\sim\pi_\theta}
\left[(R(\tau)-b(x))
\sum_{t=1}^{T}\nabla_\theta\log\pi_\theta(y_t\mid x,y_{<t})\right].
\end{aligned}
\tag{7}
$$

最后一步用了轨迹概率的乘积形式：乘积取对数变成各 token 的 log 概率之和，再逐项求导。实现时，\(R(\tau)-b(x)\) 作为不参与反向传播的权重，乘在这些 log 概率的梯度上。对多道题训练时，再取 \(x\sim q\) 的期望，就得到平均奖励的梯度。

\(R(\tau)-b(x)\) 称为这条轨迹的奖励优势。单条轨迹的优势为正时，其更新方向增大该轨迹的 log 概率；优势为负时，方向相反。**这样，完整回答的结果反馈，就变成了对生成这条回答的每个 token 的参数更新。** 如果检查、回溯等行为所在的轨迹经常取得正优势，它们就有机会在更新中变得更常见。至于其中哪些步骤真正有用，以及这种更新怎样影响未采样的回答，第 4 节会继续分析。

基线的作用是改善这个梯度估计的稳定性，而不是提供新的成功轨迹。例如，所有轨迹奖励都等于常数 \(c\) 时，真实梯度为零，但有限样本的 \(\widehat g_0=cN^{-1}\sum_i s_i\) 通常不为零；取 \(b(x)=c\) 就能让估计精确为零。一般情况下，合适的基线也可以通过抵消随机波动来降低方差。

这回答了核心问题中的“变化怎样产生”：结果反馈通过优势加权的 log 概率梯度改变生成分布，基线改善的是估计稳定性。至于这次更新是否改善了真正有用的步骤、是否惠及其他回答，还需要第 4 节继续分析。对于第 2 节的完整目标，还要加入 KL 项的梯度。下一节先检查 GRPO 的组内比较会让哪些题目获得更新信号。

### 3.4 GRPO 怎样改变真正参与学习的问题与权重

固定问题 \(x\)，设当前答对概率为 \(p=p_\theta(x)\)，独立采样 \(G\) 条轨迹，奖励 \(R_i\in\{0,1\}\)。常见的组内标准化优势为

$$
\bar R=\frac1G\sum_{i=1}^G R_i,\qquad
s_R^2=\frac1G\sum_{i=1}^G(R_i-\bar R)^2,\qquad
\hat A_i=\frac{R_i-\bar R}{s_R}.
$$

全对或全错时 \(s_R=0\)，实践中跳过该组或通过数值稳定项把其奖励梯度置零。一个组能提供非零的相对奖励信号，当且仅当同时出现成功与失败。把“这组里既有成功也有失败”记为事件 \(M\)，称为混合组。记号 \(m_G(p)=\Pr(M)\) 表示：单条轨迹成功率为 \(p\)、每组独立生成 \(G\) 条时，出现混合组的概率。

每条轨迹成功的概率都是 \(p\)，由独立性，\(G\) 条全成功的概率为 \(p^G\)；同理，全失败的概率为 \((1-p)^G\)。全成功、全失败和混合组是互斥且覆盖所有情况的三种事件，所以

$$
m_G(p)=\Pr(M)
=1-\Pr(\text{全成功})-\Pr(\text{全失败})
=1-p^G-(1-p)^G.
$$

当 \(G\ge2\) 固定、\(Gp\ll1\) 时，成功非常稀少。用二项式展开全失败的概率：

$$
(1-p)^G=1-Gp+\binom G2p^2-\cdots+(-1)^Gp^G.
$$

其中 \(\binom G2=G(G-1)/2\)。忽略相对于 \(Gp\) 很小的二次及更高次项，并注意 \(p^G\) 也比 \(Gp\) 小，得到

$$
m_G(p)\approx1-0-(1-Gp)=Gp.
$$

也就是说，这时一组获得区分信号的概率只有约 \(Gp\)。即使理想奖励梯度存在，绝大多数实际采样组也可能全失败，因而没有可用的组内奖励差异。

若先按 \(q(x)\) 抽题，再只保留混合组，保留下来的题目就不再服从原来的 \(q\)。用随机变量 \(X\) 表示抽到的题目，事件 \(M\) 表示该题生成的组被保留，则

$$
\Pr(X=x,M)
=\Pr(X=x)\Pr(M\mid X=x)
=q(x)m_G(p_\theta(x)).
$$

这是“先抽到题目 \(x\)，再为它生成一个混合组”的联合概率。对所有可能的题目求和，得到一次抽题最终被保留的总概率：

$$
\Pr(M)
=\sum_{x'}q(x')m_G(p_\theta(x'))
=\mathbb E_{x'\sim q}[m_G(p_\theta(x'))].
$$

其中 \(x'\) 只是求和变量，用来遍历题目。总保留概率大于零时，按条件概率定义，保留后的题目分布为

$$
\begin{aligned}
q_{\rm kept}(x)
&=\Pr(X=x\mid M)
=\frac{\Pr(X=x,M)}{\Pr(M)}\\
&=\frac{q(x)m_G(p_\theta(x))}
{\mathbb E_{x'\sim q}[m_G(p_\theta(x'))]}.
\end{aligned}
$$

分子给原抽题概率乘上该题的保留概率，分母把这些权重归一化。因而在原始抽题概率相同的情况下，几乎总对或总错的题目较少留下，更容易同时生成对错回答的题目较多留下。

DAPO 的 Dynamic Sampling [4] 针对全对、全错的无效组继续采样，从而维持有效训练批次。这类机制提高了梯度利用率，也使训练中真正发生作用的任务分布随模型能力变化。

即便不除以标准差，仅减去同组均值，基线也与当前轨迹相关。令 \(g_i=\nabla_\theta\log\pi_\theta(\tau_i\mid x)\)，利用独立性和 \(\mathbb E[g_i]=0\)，可得

$$
\mathbb E\left[\frac1G\sum_i(R_i-\bar R)g_i\right]
=\left(1-\frac1G\right)\nabla_\theta p_\theta(x).
$$

它与第 3.3 节“不依赖本次轨迹的基线”已有区别。再考虑大组极限，组内均值和标准差分别趋近 \(p\) 与 \(\sqrt{p(1-p)}\)。忽略裁剪、KL 项、回答长度归一化和离策略采样时，标准化后的期望更新方向近似为

$$
\begin{aligned}
\mathbb E[\hat A\,g]
&\approx\frac{\nabla_\theta p_\theta(x)}
{\sqrt{p_\theta(x)(1-p_\theta(x))}}\\
&=\nabla_\theta\left[2\arcsin\sqrt{p_\theta(x)}\right].
\end{aligned}
$$

所以，在这个极限下，对问题取平均对应的是优化
\(\mathbb E_x[2\arcsin\sqrt{p_\theta(x)}]\)，而不再是单纯的平均正确率 \(\mathbb E_x[p_\theta(x)]\)。标准化对不同难度的问题施加了不同权重。有限组中还要叠加 \(m_G(p)\) 所描述的“有没有信号”，二者不能混为一谈。

Dr. GRPO [5] 分析了组内标准差导致的问题难度偏置，以及按回答长度平均损失导致的长度偏置。数学上的启示是：**奖励相同并不意味着训练目标相同；采样、基线、归一化和长度加权共同决定了模型实际收到的更新。**

这也影响安全数据的训练权重。若安全奖励只有“违规为 0、未违规为 1”，某类风险提示在当前批次中全获 1 分，其组内优势就是零。过滤全对组能提高即时梯度的利用率，却不会主动复习这些提示上的安全行为；其他任务的参数更新仍可能改变它们。这给出了保留安全示范回放或持续安全约束的动机：即使当前违规率很低，也要限制其他任务更新造成的偏移。

这些结果为“分数提高是否伴随覆盖扩大”提供了一个训练层面的解释：各题并不拥有相同的有效更新机会，尤其困难题可能长期没有混合组。模型因而可能在部分题上进步，而另一些题仍得不到改善；实际是否如此，要检查分题成功率。接下来进一步问，即使获得了信号，只有最终对错又怎样改善推理过程？

## 4. 学习机制：终端奖励怎样改善过程与未采样的回答？

上一部分解释了完整轨迹如何形成更新信号。现在把“改善推理”拆成两个问题：同一条轨迹中，哪些步骤使成功更有可能；不同轨迹之间，一条成功样本上的更新怎样影响其他回答。前者从条件概率出发，后者必须进入参数空间。

### 4.1 从完整轨迹的奖励，到每个前缀的后续价值

第 3.3 节的式（7）中，同一条轨迹的所有 token 乘以相同的结果优势。这容易让人以为结果奖励无法区分中间步骤。实际上，单次采样中的权重相同，跨许多可能后续取期望后的步骤价值并不相同。

考虑固定提示、有限长度的自回归生成，把前缀记为 \(s=(x,y_{<t})\)，下一个 token 记为 \(a\)，拼接后的前缀记为 \(sa\)。定义

$$
h(s)=\mathbb E_{\tau\sim\pi_0(\cdot\mid s)}
[e^{R(\tau)/\beta}],\qquad V(s)=\beta\log h(s).
$$

\(h(s)\) 汇总从当前前缀继续生成的所有完整轨迹，按参考模型概率加权；高奖励后续越容易出现，它越大。对完整轨迹应用式（2），再把相同前缀下的后续求和，得到最优前缀概率

$$
\pi^*(s\mid x)=\frac{\pi_0(s\mid x)h(s)}{h(x)}.
$$

因此最优的下一步选择是

$$
\boxed{
\pi^*(a\mid s)
=\frac{\pi^*(sa\mid x)}{\pi^*(s\mid x)}
=\pi_0(a\mid s)\frac{h(sa)}{h(s)}
=\pi_0(a\mid s)e^{[V(sa)-V(s)]/\beta}.
}
$$

又因为 \(h(s)=\sum_a\pi_0(a\mid s)h(sa)\)，所以

$$
V(s)=\beta\log\sum_a\pi_0(a\mid s)e^{V(sa)/\beta},
\qquad V(\text{完整轨迹})=R(\tau).
$$

这就是一个带参考策略的 soft Bellman 递推：从最终奖励向前，计算每个前缀能够接上的高价值后续，再据此改变下一步 token 的概率。**终端奖励在理想最优策略中，并不是均匀地“表扬所有 token”，而是偏向那些把后续带到更有希望区域的 token。** 实际训练的困难，是从有限的完整轨迹估计这种后续价值。这个推导也说明了序列分布推断与 KL 正则控制的联系 [6]。

这种联系可以从 KL 的链式分解直接确认。记 \(d_{\pi,t}(s)\) 为策略 \(\pi\) 在第 \(t\) 步访问前缀 \(s\) 的概率，则

$$
\begin{aligned}
\mathrm{KL}(\pi(\tau\mid x)\|\pi_0(\tau\mid x))
&=\mathbb E_{\tau\sim\pi}\sum_t
\log\frac{\pi(y_t\mid x,y_{<t})}{\pi_0(y_t\mid x,y_{<t})}\\
&=\sum_t\mathbb E_{s\sim d_{\pi,t}}
\mathrm{KL}(\pi(\cdot\mid s)\|\pi_0(\cdot\mid s)).
\end{aligned}
$$

每个位置的变化不是被等权、脱离上下文地评价，而是按新策略实际访问该前缀的频率加权。这也是为什么对旧策略采出的前缀做局部更新，与已经求出完整轨迹分布的最优解之间仍有距离。

对安全而言，这个前缀视角区分了“从开头生成时通常安全”和“已经走到某个风险前缀后仍能恢复”。设 \(s\) 是一个特定前缀，\(U\) 表示后续发生违规，则

$$
\Pr_\pi(s\text{ 被生成且后续违规}\mid x)
=\Pr_\pi(s\mid x)\Pr_\pi(U\mid s).
$$

只降低到达 \(s\) 的概率，就能降低这条路径对总体违规率的贡献，却不一定降低第二项。上面的 KL 链式分解也表明，当前策略很少访问的前缀，在平均分布变化中权重很小。若多轮对话或其他输入把模型带到这些前缀，安全判断就需要在后续生成中继续生效。

*Safety Alignment Should Be Made More Than Just a Few Tokens Deep* [7] 在所研究的模型中观察到，安全对齐造成的分布变化主要集中在开头少量 token；作者通过加入从不安全前缀恢复到安全回答的训练样本，改善了若干测试中的鲁棒性。这里的关键研究问题是：安全训练有没有改变风险前缀下的条件行为，而不仅是增加拒答开头的概率。

对带工具的任务，还应把安全事件定义在完整行动轨迹上：例如有没有越权操作、泄露数据或跳过必要检查。终端奖励可以在结束时读取完整轨迹并评价这些事件；如果只检查最后一句回复，就没有为中间行为提供相应反馈。

对二值奖励，令 \(p_0(s)=\Pr_{\pi_0}(R=1\mid s)\)，则

$$
h(s)=1+(e^{1/\beta}-1)p_0(s).
$$

这把抽象的“后续价值”化成了一个可解释量：当前前缀最终答对的概率。过程监督若能准确估计这个量，就能够更直接地区分有用步骤和无用步骤；如果它只奖励某种文字外观，则未必提供这种信息。

这套最优分布分析怎样对应实际的策略梯度？对当前策略定义 \(Q_\theta(s,a)=\mathbb E_{\pi_\theta}[R(\tau)\mid s,a]\)，即先走到前缀 \(s\)、选择 token \(a\)，再按当前策略继续生成时的平均最终奖励。令 \(d_{\theta,t}\) 是当前策略在第 \(t\) 步的前缀分布。对式（7）中的后续轨迹先取条件期望，就得到

$$
\begin{aligned}
\nabla_\theta J_x
&=\sum_t\mathbb E_{s\sim d_{\theta,t},\,a\sim\pi_\theta(\cdot\mid s)}
\left[(Q_\theta(s,a)-b(x))
\nabla_\theta\log\pi_\theta(a\mid s)\right].
\end{aligned}
$$

这个等式使用的是同一个期望梯度：单条轨迹的结果奖励，是对各个已访问步骤后续价值的一次有噪声的观测；对可能的后续平均以后，不同 token 的权重由各自的 \(Q_\theta\) 区分。因此，结果奖励确实可以对中间步骤产生不同的选择。它选中的是更容易带来高奖励后续的步骤，这些步骤是否也构成正确推理，还取决于结果与过程正确性的关系，下一节给出这个条件。

### 4.2 答案奖励什么时候能够提高过程正确率

后续价值说明最终奖励能够区分前缀，但“更容易得到正确答案”仍不等于“推理过程正确”。要判断结果奖励是否同时改善过程，需要计算过程正确率如何随奖励优化强度变化。

将优化强度记为 \(\kappa=1/\beta\)。固定一个提示，并假设奖励有界，暂时省略 \(x\)，定义

$$
Z(\kappa)=\mathbb E_{\pi_0}[e^{\kappa r}],\qquad
\psi(\kappa)=\log Z(\kappa),\qquad
\pi_\kappa(y)=\pi_0(y)e^{\kappa r(y)-\psi(\kappa)}.
$$

\(\psi\) 不只是归一化常数的对数。对它求导得到当前分布下的奖励均值，进而可以计算每个回答的概率怎样变化：

$$
\begin{aligned}
Z'(\kappa)&=\sum_y\pi_0(y)r(y)e^{\kappa r(y)},\\
\psi'(\kappa)&=\frac{Z'(\kappa)}{Z(\kappa)}
=\sum_y\frac{\pi_0(y)e^{\kappa r(y)}}{Z(\kappa)}r(y)
=\sum_y\pi_\kappa(y)r(y)
=\mathbb E_{\pi_\kappa}[r].
\end{aligned}
$$

再对 \(\pi_\kappa(y)=\pi_0(y)e^{\kappa r(y)-\psi(\kappa)}\) 求导。\(\pi_0\) 与 \(r\) 都不随 \(\kappa\) 改变，因此

$$
\begin{aligned}
\frac{\partial\pi_\kappa(y)}{\partial \kappa}
&=\pi_0(y)e^{\kappa r(y)-\psi(\kappa)}[r(y)-\psi'(\kappa)]\\
&=\pi_\kappa(y)[r(y)-\mathbb E_{\pi_\kappa}[r]].
\end{aligned}
$$

对于不随 \(\kappa\) 改变的行为指标 \(f(y)\)，有

$$
\begin{aligned}
\frac{d}{d\kappa}\mathbb E_{\pi_\kappa}[f]
&=\frac{d}{d\kappa}\sum_y\pi_\kappa(y)f(y)\\
&=\sum_y f(y)\frac{\partial\pi_\kappa(y)}{\partial \kappa}\\
&=\sum_y\pi_\kappa(y)f(y)[r(y)-\mathbb E_{\pi_\kappa}[r]]\\
&=\mathbb E_{\pi_\kappa}[fr]
-\mathbb E_{\pi_\kappa}[f]\mathbb E_{\pi_\kappa}[r]\\
&=\operatorname{Cov}_{\pi_\kappa}(f,r).
\end{aligned}
$$

这给出了比“高奖励回答被放大”更精确的作用机制：**一个行为沿最优分布曲线增强还是减弱，取决于它在当前分布中与奖励的协方差。** 要回答本节的问题，就把这个行为指标具体取为“推理过程是否正确”。

把“推理过程正确”记为事件 \(C=1\)，最终答案正确记为 \(R=1\)。在按答案奖励倾斜的当前分布中，令

$$
u=\Pr(C=1),\qquad
\alpha=\Pr(R=1\mid C=1),\qquad
\gamma=\Pr(R=1\mid C=0).
$$

将行为指标取为正确过程的指示函数，得到

$$
\begin{aligned}
\frac{d}{d\kappa}\Pr_{\pi_\kappa}(C=1)
&=\operatorname{Cov}_{\pi_\kappa}(\mathbf1_C,R)\\
&=\mathbb E[\mathbf1_C R]-\mathbb E[\mathbf1_C]\mathbb E[R]\\
&=u\alpha-u\bigl[u\alpha+(1-u)\gamma\bigr]\\
&=u(1-u)(\alpha-\gamma).
\end{aligned}
$$

只要正确过程比错误过程更容易导向正确答案，即 \(\alpha>\gamma\)，单看结果的奖励也会提高正确过程的比例。这与 *Reinforcement Learning with Verifiable Rewards Implicitly Incentivizes Correct Reasoning in Base LLMs* [2] 的核心机制一致：它依赖基础模型中推理正确性与答案正确性的正关联。若错误过程依赖捷径或猜测也经常答对，这种信号就会减弱。实际参数更新中的效果还要经过第 4.3 节的轨迹耦合，不能仅从优势的符号判断所有轨迹如何变化。

同一个协方差公式也能检验安全奖励是否真的鼓励安全行为。令 \(U\) 表示实际违规事件，\(\hat r\) 是训练中使用的代理评分，\(\widehat\pi_\kappa\propto\pi_0e^{\kappa\hat r}\)。则

$$
\frac{d}{d\kappa}\Pr_{\widehat\pi_\kappa}(U)
=\operatorname{Cov}_{\widehat\pi_\kappa}(\mathbf1_U,\hat r).
$$

要让违规率随优化下降，代理评分必须在模型当前生成的回答中，对违规行为形成负向选择。如果某些违规回答利用了评分漏洞而获得高分，这个协方差就可能变为正：优化越来越成功，实际行为却越来越不安全。

进一步把代理评分写成 \(\hat r=r+\varepsilon\)，其中 \(r\) 表示真实目标，\(\varepsilon\) 表示评分误差。固定这两个评分函数，只改变优化强度 \(\kappa\)。在上面的协方差恒等式中，分别取行为指标 \(f=\hat r\) 和 \(f=r\)，得到

$$
\begin{aligned}
\frac{d}{d\kappa}\mathbb E_{\widehat\pi_\kappa}[\hat r]
&=\operatorname{Cov}_{\widehat\pi_\kappa}(\hat r,\hat r)
=\operatorname{Var}_{\widehat\pi_\kappa}(\hat r)\ge0,\\
\frac{d}{d\kappa}\mathbb E_{\widehat\pi_\kappa}[r]
&=\operatorname{Cov}_{\widehat\pi_\kappa}(r,r+\varepsilon)\\
&=\operatorname{Var}_{\widehat\pi_\kappa}(r)
+\operatorname{Cov}_{\widehat\pi_\kappa}(r,\varepsilon).
\end{aligned}
$$

真实质量的导数由两项组成：真实目标自身的方差，以及它与评分误差的协方差。如果低质量回答反而被高估，后一项可能为负；当它小于 \(-\operatorname{Var}_{\widehat\pi_\kappa}(r)\) 时，真实质量就会下降，而代理分数仍在上升。关键是这些量都在优化后的当前分布下计算：评分器在原始数据上表现良好，并不足以保证它在模型越来越偏好的回答上仍然准确。

可见的推理文本同样不能自动替代行为验证。2026 年的 *Reward Misspecification Degrades Chain-of-Thought Monitorability* [8] 在配对的真实奖励与错误奖励实验中发现，仅对输出使用错误奖励，就能诱导不符合任务意图的行为，同时使思维链监控更难识别这些行为。研究中的模型仍可能在思维链里讨论正常任务意图，最终输出却利用了奖励漏洞。因此，“推理过程提到了安全原则”需要与真实行动、实际违规和监控器的漏报一起评估。

本节对“过程是否更可靠”给出的答案是有条件的：沿理想优化路径，正确过程与结果奖励的正关联提供改善信号；奖励偏差则可能把这种选择导向错误行为。因此，判断过程收益需要检查实际过程或行为，而不能只观察用于训练的分数。

### 4.3 参数共享怎样把更新传递到其他轨迹

把回答分布中的每条轨迹当作独立变量，无法解释神经网络训练中的迁移。实际模型共享参数：强化一个问题上的一条轨迹，会同时改变许多其他问题与轨迹的概率。

令 \(u=(x,\tau)\) 表示一个提示与轨迹组合，定义它的梯度向量

$$
s_\theta(u)=\nabla_\theta\log\pi_\theta(\tau\mid x).
$$

考虑一次普通策略梯度上升，步长为 \(\eta\)，优势为 \(A(u)\)，采样分布是 \(x\sim q,\tau\sim\pi_\theta\)：

$$
\Delta\theta=\eta\,\mathbb E_u[A(u)s_\theta(u)].
$$

对于任意另一条轨迹 \(u'=(x',\tau')\)，一阶展开给出

$$
\begin{aligned}
\Delta\log\pi_\theta(\tau'\mid x')
&=s_\theta(u')^\top\Delta\theta+O(\eta^2)\\
&=\eta\,\mathbb E_u[A(u)K_\theta(u',u)]+O(\eta^2),\\
K_\theta(u',u)&=s_\theta(u')^\top s_\theta(u).
\end{aligned}
$$

\(K_\theta\) 衡量两条轨迹对参数变化的响应是否一致。正优势轨迹若与另一条轨迹的梯度同向，另一条也会被强化；反向则会被压低。\(u'\) 是否出现在这次训练样本中，并不影响这个一阶关系。

这些公式把一次训练更新的作用分成两部分。\(A(u)\) 决定采样轨迹 \(u\) 应被强化还是抑制；\(K_\theta(u',u)\) 决定这次更新会怎样影响另一条轨迹 \(u'\)。如果模型在两条轨迹中使用了相近的参数计算，强化其中一条就可能同时提高另一条的概率。若两条轨迹对同一参数的需求相反，强化一条就可能损害另一条。是否发生迁移，要看这些梯度乘积，而不只是两段文本是否相似。

因此，未出现在训练样本中的回答，也会随参数更新而改变。式（2）给出的是一个完整分布的最优形状；这里的梯度内积则说明，实际网络通过共享参数更新时，已采样的奖励信号怎样影响其他回答。

安全保持也是同一个参数共享问题。若一次任务更新给某条轨迹正优势，而它与未采样的违规回答具有正的梯度内积，那条违规回答的概率也可能上升。训练数据是否直接出现危险请求，不足以确定安全行为是否会保持不变。

*Emergent Misalignment: Narrow finetuning can produce broadly misaligned LLMs* [9] 展示了更强的跨任务现象：在其设置中，让模型生成未向用户披露的有漏洞代码，会使部分模型在无关的非代码问题上表现出更广泛的不对齐行为；加入正当教学用途的上下文后，对照实验的结果不同。这说明训练样本的语境和所传递的行为模式都可能影响迁移。上面的梯度内积提供了研究局部影响的工具，而这类多轮训练后的广泛变化，还需要跟踪整个更新过程。

本节为“能够解决更多问题”提供了迁移机制：更新的影响可以超出采样到的回答，传递到其他题目的轨迹；梯度内积也允许这种影响为负。是否扩大任务覆盖，要看这些变化合计后怎样影响各题成功率。结合前两节，我们已经分别得到步骤选择、过程改善条件和跨轨迹迁移的解释。

下一部分回到开场的论文分歧：正确率、过程可靠性与任务覆盖分别发生了什么变化，现有评估能否区分它们？

## 5. 回到论文争论：哪些证据支持哪一种增益？

前面已经分析了奖励定义的目标、有限样本提供的信号，以及参数更新影响其他轨迹的机制。现在要解释为什么模型单次回答更准，却可能在大量采样时覆盖更少的问题；也要判断答案正确率与过程可靠性的改善，是否能由同一个指标测出来。

### 5.1 pass@k 反映怎样的成功概率分布

令 \(p_\theta(x)\) 为模型在问题 \(x\) 上、指定解码设置下的单次成功率。独立采样 \(k\) 次，至少一次成功的概率为

$$
\operatorname{pass@}k(x)=1-(1-p_\theta(x))^k.
$$

对任务分布取平均后，评估指标为

$$
P_k(\theta)=\mathbb E_{x\sim q}
[1-(1-p_\theta(x))^k].
$$

对单个问题，\(p_\theta(x)\) 增加就会使所有 \(k\) 下的 pass@k 增加。但在问题集合上，平均 pass@1 上升并不保证平均 pass@k 上升。

例如，两类问题等概率出现，基础模型成功率为 \((0.6,0.2)\)，训练后为 \((0.95,0.01)\)。平均 pass@1 从 \(0.40\) 升至 \(0.48\)，而 pass@10 从约 \(0.946\) 降至 \(0.548\)。模型在一类题上明显进步，却几乎丢掉了另一类题。

这个现象可以从曲率理解。对 \(k>1\)，

$$
f_k(p)=1-(1-p)^k,\qquad
f_k''(p)=-k(k-1)(1-p)^{k-2}\le0.
$$

\(f_k\) 是凹函数。在平均成功率固定时，把能力极端集中到少数问题上，会降低平均 pass@k；提高困难问题的微小成功率，往往比继续提升已经很容易的问题更有价值。因此，pass@k 曲线交叉揭示的是不同任务之间的概率重分配，不能只用一个“推理能力变强或变弱”概括。

有限采样也无法证明成功概率严格为零。对一个固定问题，若 \(N\) 次独立尝试都失败，成功率的 95% 单侧上界为

$$
p\le1-0.05^{1/N}\approx\frac3N.
$$

它排除了一部分较大的成功概率，却没有证明基础模型绝不可能解出该题。实验上更可操作的“能力边界”，应当同时指定任务、成功判据和计算预算。

把事件从“答对”换成“违规”，同样的计算给出了重复尝试下的安全风险。对一个固定设置，若每次独立尝试的违规概率为 \(p_{\rm unsafe}\)，在 \(k\) 次尝试中至少一次违规的概率就是

$$
\operatorname{risk@}k=1-(1-p_{\rm unsafe})^k.
$$

这里用 \(\operatorname{risk@}k\) 表示上述事件概率。即使单次违规率只有 \(0.1\%\)，独立尝试 1,000 次后，至少一次违规的概率也约为 \(63.2\%\)。因此，“一次测试没有违规”和“在给定尝试预算下保持安全”需要不同证据。自适应攻击会根据此前反馈改变输入，此时应直接评估完整交互过程，而不是套用独立同分布的公式。

实际评估应同时报告危险请求上的违规率与正常请求上的帮助性、误拒率，并明确攻击或尝试预算。若一个模型仅因更频繁地拒绝所有请求而降低违规率，帮助性评估会揭示这笔代价。对特定风险群体、语言或任务类型，也应分别统计，避免总体平均掩盖高风险部分。

### 5.2 论文分歧对应哪些不同的观察

第 5.1 节说明，答案采样指标测到的是各题成功概率的变化；第 4.2 节说明，过程可靠性还取决于奖励与过程的关系。现在据此区分开场两组论文各自支持的结论。

*Does Reinforcement Learning Really Incentivize Reasoning Capacity in LLMs Beyond the Base Model?* [1] 在多种模型和数学、代码、视觉推理任务上观察到：RLVR 模型在较小 \(k\) 下更好，基础模型在较大 \(k\) 下可以追上或超过它；蒸馏则能明显改善更广范围的 pass@k。这支持一个经验判断：在那些训练设置中，RL 的收益很大一部分来自成功概率的集中，而不是普遍扩大题目覆盖。

*Reinforcement Learning with Verifiable Rewards Implicitly Incentivizes Correct Reasoning in Base LLMs* [2] 进一步检查“最终答案正确”和“推理过程也正确”的差别。作者对数学思维链引入模型评判器并做人工检查，使用 CoT-Pass@K 后，在部分任务上得到不同于答案 pass@k 的比较结果。它揭示了一个测量问题：大量采样偶然命中答案，不一定对应同样可靠的推理过程。与此同时，CoT-Pass@K 本身依赖过程评判器的准确性，不能自动被当作无误的能力测量。

这两篇论文并不只是给出了相反的口号：它们暴露了**任务覆盖、答案命中率、过程可靠性**三者之间的差别。第 4.2 节还指出，只要过程正确性与最终奖励相关，结果奖励确实能够提供改进过程的信号；第 4.3 节则说明，这个信号会通过共享参数迁移到其他轨迹。

第 3.2 节讨论的 *RLVR landscapes for iterated multiplications can be benign* [3] 还在受控任务中展示了从零训练学习算法式思维链的可能性。它提示我们，后训练的作用也可能体现在可学习的算法结构上，而不仅是提高已采到答案的出现频率。

而 *Post-training is (Massive) Supervised Learning* [10] 用大规模推理 SFT 比较预训练初始化与随机初始化，发现后者也能在相应数学和代码分布上获得显著表现。这个实验直接支持的是：大量后训练数据本身能够传授能力，后训练不必只负责激活已有知识。它并没有把只有结果反馈的 RL 与完整推理轨迹监督证明成同一个学习问题。

安全研究还需要检查这些增益能否经受后续训练。2026 年的 *Safety Mid-Training: Internalizing LLM Safety as a Foundational Capability* [11] 将安全与一般任务组织成共享的意图理解、知识应用和后果推理训练，在其测试的模型与数据上，观察到后续只使用一般数据的 SFT 和 GRPO 后仍保留较多安全收益。它提供了一个与前文对应的研究方向：把安全判断训练成可迁移的能力，并用后续训练后的行为保持来检验，而不只看安全训练刚结束时的分数。

这些证据对核心问题给出了分开的回答：答案 pass@k 反映所测任务上的成功概率与覆盖，过程评估补充推理可靠性的证据，未见任务和后续训练评估则检查迁移与保持。同一个模型可以在其中一项改善、另一项退步；论文结论应当对应它实际测量的那一项。

### 5.3 如何判断一项后训练工作的贡献

回到最初的问题，全文给出的判断是：**正确率增益既可能来自既有成功轨迹被更频繁地采到，也可能伴随过程改善和任务覆盖扩展；仅看这个增益，无法区分这些情况。** 第二节给出概率重分配及不同近似准则的解释，第三节说明哪些任务实际获得学习信号，第四节给出过程改善和迁移的条件。它们共同说明为什么这些收益可能同时发生，也可能相互分离；实际实现了哪一种，需要下面的证据：

1. **概率集中还是覆盖扩展？** 同时检查各问题的成功率变化与多个采样预算下的 pass@k。安全评估则检查各类风险与尝试预算下的违规概率，并同时报告正常请求的帮助性和误拒率。
2. **答案命中还是过程更可靠？** 使用过程验证、可执行中间结果或对中间步骤的干预。对于安全行为，检查完整行动轨迹、风险前缀下的恢复，以及监控器能否识别实际违规。
3. **更多计算还是更有效的计算？** 在相同总 token 或 FLOPs 预算下比较效果。
4. **记住训练分布还是学会可复用规则？** 改变任务组合、长度或环境，测试未见结构上的迁移。对安全训练，再检查提示改写、多轮交互和后续一般任务微调之后，原有安全判断是否保持。

由此，“后训练的数学本质”可以表述得更完整：

> **后训练用反馈定义目标行为分布，用有限采样获得更新信号，再通过共享参数改变已见与未见回答的概率。它能否带来更可靠的推理与安全行为，取决于奖励是否反映真实目标、采样是否提供有效信号，以及参数更新如何在轨迹之间迁移。**

## 参考文献

1. *Does Reinforcement Learning Really Incentivize Reasoning Capacity in LLMs Beyond the Base Model?* (2025). https://arxiv.org/abs/2504.13837
2. *Reinforcement Learning with Verifiable Rewards Implicitly Incentivizes Correct Reasoning in Base LLMs* (2025). https://arxiv.org/abs/2506.14245
3. *RLVR landscapes for iterated multiplications can be benign: Insights from spin-glass theory* (2026). https://arxiv.org/abs/2609.28625
4. *DAPO: An Open-Source LLM Reinforcement Learning System at Scale* (2025). https://arxiv.org/abs/2503.14476
5. *Understanding R1-Zero-Like Training: A Critical Perspective* (2025). https://arxiv.org/abs/2503.20783
6. *Reinforcement Learning and Control as Probabilistic Inference: Tutorial and Review* (2018). https://arxiv.org/abs/1805.00909
7. *Safety Alignment Should Be Made More Than Just a Few Tokens Deep* (2024). https://arxiv.org/abs/2406.05946
8. *Reward Misspecification Degrades Chain-of-Thought Monitorability* (2026). https://arxiv.org/abs/2610.28303
9. *Emergent Misalignment: Narrow finetuning can produce broadly misaligned LLMs* (2025). https://arxiv.org/abs/2502.17424
10. Hassid, Adi & Schwartz (2026), *Post-training is (Massive) Supervised Learning*. https://arxiv.org/abs/2606.07527
11. *Safety Mid-Training: Internalizing LLM Safety as a Foundational Capability* (2026). https://arxiv.org/abs/2610.26809
